function rendererError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Unknown shader compilation error';
    gl.deleteShader(shader);
    throw rendererError('E_WEBGL_SHADER', message);
  }
  return shader;
}

function program(gl) {
  const vertex = compile(gl, gl.VERTEX_SHADER, `#version 300 es
    in vec3 a_position;
    in vec3 a_color;
    out vec3 v_color;
    uniform float u_point_size;
    void main() {
      gl_Position = vec4(a_position, 1.0);
      gl_PointSize = u_point_size;
      v_color = a_color;
    }
  `);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, `#version 300 es
    precision highp float;
    in vec3 v_color;
    out vec4 out_color;
    void main() {
      out_color = vec4(v_color, 0.92);
    }
  `);
  const result = gl.createProgram();
  gl.attachShader(result, vertex);
  gl.attachShader(result, fragment);
  gl.linkProgram(result);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(result, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(result) || 'Unknown shader link error';
    gl.deleteProgram(result);
    throw rendererError('E_WEBGL_PROGRAM', message);
  }
  return result;
}

function color(kind) {
  if (kind === 'snapstate') return [0.57, 0.9, 0.85];
  if (kind === 'receipt') return [0.95, 0.77, 0.48];
  if (kind === 'event') return [0.55, 0.71, 1.0];
  if (kind === 'subjective') return [0.93, 0.61, 1.0];
  return [0.75, 0.82, 0.84];
}

function normalizedPositions(objects) {
  const axes = ['x', 'y', 'z'];
  const bounds = Object.fromEntries(axes.map((axis) => {
    const values = objects.map((object) => object.position[axis]);
    return [axis, { min: Math.min(...values), max: Math.max(...values) }];
  }));
  return new Map(objects.map((object) => {
    const mapped = axes.map((axis) => {
      const { min, max } = bounds[axis];
      if (min === max) return 0;
      return ((object.position[axis] - min) / (max - min)) * 1.7 - 0.85;
    });
    return [object.objectId, [mapped[0], mapped[1], mapped[2] * 0.4]];
  }));
}

function writeVertex(target, position, vertexColor) {
  target.push(position[0], position[1], position[2], vertexColor[0], vertexColor[1], vertexColor[2]);
}

function resizeCanvas(canvas, gl) {
  const ratio = Math.max(1, globalThis.devicePixelRatio || 1);
  const width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
  const height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
}

export class TrustscapeRenderer {
  constructor(canvas) {
    if (!(canvas instanceof HTMLCanvasElement)) throw rendererError('E_WEBGL_CANVAS', 'Trustscape requires a canvas element');
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', { antialias: true, alpha: false, preserveDrawingBuffer: false });
    if (!this.gl) throw rendererError('E_WEBGL2_UNAVAILABLE', 'WebGL2 is unavailable in this browser');
    this.program = program(this.gl);
    this.buffer = this.gl.createBuffer();
    this.positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
    this.colorLocation = this.gl.getAttribLocation(this.program, 'a_color');
    this.pointSizeLocation = this.gl.getUniformLocation(this.program, 'u_point_size');
  }

  render(model) {
    const gl = this.gl;
    resizeCanvas(this.canvas, gl);
    gl.clearColor(0.01, 0.035, 0.047, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!model?.objects?.length) return;

    const positions = normalizedPositions(model.objects);
    const objectById = new Map(model.objects.map((object) => [object.objectId, object]));
    const lineVertices = [];
    for (const thread of model.threads) {
      const from = objectById.get(thread.fromObjectId);
      const to = objectById.get(thread.toObjectId);
      if (!from || !to) continue;
      writeVertex(lineVertices, positions.get(from.objectId), [0.28, 0.46, 0.5]);
      writeVertex(lineVertices, positions.get(to.objectId), [0.28, 0.46, 0.5]);
    }
    const pointVertices = [];
    for (const object of model.objects) writeVertex(pointVertices, positions.get(object.objectId), color(object.kind));

    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.enableVertexAttribArray(this.positionLocation);
    gl.enableVertexAttribArray(this.colorLocation);
    gl.vertexAttribPointer(this.positionLocation, 3, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(this.colorLocation, 3, gl.FLOAT, false, 24, 12);

    if (lineVertices.length) {
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineVertices), gl.DYNAMIC_DRAW);
      gl.uniform1f(this.pointSizeLocation, 1);
      gl.drawArrays(gl.LINES, 0, lineVertices.length / 6);
    }
    if (pointVertices.length) {
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pointVertices), gl.DYNAMIC_DRAW);
      gl.uniform1f(this.pointSizeLocation, 8 * Math.max(1, globalThis.devicePixelRatio || 1));
      gl.drawArrays(gl.POINTS, 0, pointVertices.length / 6);
    }
  }
}
