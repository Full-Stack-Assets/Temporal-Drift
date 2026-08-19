/**
 * AssetPipelineLoader — sequential async queue for glTF / GLB / JSON assets.
 * Accepts real URLs; uses PlayCanvas Asset system for containers.
 */

import * as pc from 'playcanvas';

export class AssetPipelineLoader {
  /**
   * @param {pc.AppBase} app
   * @param {object} options
   */
  constructor(app, options = {}) {
    this.app = app;
    this.queue = [];
    this.loading = false;
    this.loaded = new Map();
    this.retries = options.retries ?? 2;
    this.yieldMs = options.yieldMs ?? 30;
    this.onProgress = options.onProgress || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onError = options.onError || ((id, err) => console.warn('[Loader]', id, err));
  }

  /**
   * @param {object} item
   * @param {string} item.id
   * @param {string} item.url - absolute or relative glTF/GLB/JSON URL
   * @param {string} [item.type] - 'container' | 'json' | 'texture'
   * @param {string} [item.era]
   * @param {pc.Entity} [item.parent]
   * @param {Function} [item.onLoaded]
   */
  enqueue(item) {
    this.queue.push({
      type: 'container',
      era: null,
      parent: null,
      onLoaded: null,
      attempts: 0,
      ...item
    });
    if (!this.loading) this._process();
  }

  enqueueMany(items) {
    items.forEach(i => this.enqueue(i));
  }

  get(id) {
    return this.loaded.get(id) || null;
  }

  isLoaded(id) {
    return this.loaded.has(id);
  }

  async _process() {
    if (this.loading) return;
    this.loading = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      try {
        const result = await this._loadOne(item);
        this.loaded.set(item.id, result);
        if (item.onLoaded) item.onLoaded(result);
      } catch (err) {
        item.attempts++;
        if (item.attempts <= this.retries) {
          this.queue.unshift(item);
          await this._wait(200 * item.attempts);
        } else {
          this.onError(item.id, err);
        }
      }
      const total = this.loaded.size + this.queue.length;
      this.onProgress(this.loaded.size, Math.max(total, 1), item.id);
      await this._wait(this.yieldMs);
    }

    this.loading = false;
    this.onComplete(this.loaded);
  }

  _loadOne(item) {
    return new Promise((resolve, reject) => {
      if (item.type === 'container' || item.type === 'model') {
        const asset = new pc.Asset(item.id, 'container', { url: item.url });
        asset.once('load', () => {
          let entity = null;
          try {
            if (asset.resource && typeof asset.resource.instantiateRenderEntity === 'function') {
              entity = asset.resource.instantiateRenderEntity();
              if (entity && item.parent) item.parent.addChild(entity);
            }
          } catch (e) {
            console.warn('[Loader] instantiate failed', item.id, e);
          }
          resolve({ asset, entity, id: item.id, era: item.era, url: item.url });
        });
        asset.once('error', (err) => reject(err || new Error('asset error')));
        this.app.assets.add(asset);
        this.app.assets.load(asset);
        return;
      }

      fetch(item.url)
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status} for ${item.url}`);
          return item.type === 'json' ? r.json() : r.arrayBuffer();
        })
        .then(data => resolve({ data, id: item.id, era: item.era, url: item.url }))
        .catch(reject);
    });
  }

  _wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  clearCache() {
    this.loaded.clear();
  }
}
