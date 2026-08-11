function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'Shader compilation failed');
  return shader;
}

function createProgram(gl) {
  const vertex = compile(gl, gl.VERTEX_SHADER, `#version 300 es
    in vec3 a_position;
    uniform float u_pointSize;
    void main() {
      gl_Position = vec4(a_position, 1.0);
      gl_PointSize = u_pointSize;
    }
  `);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, `#version 300 es
    precision highp float;
    uniform vec4 u_color;
    out vec4 outColor;
    void main() {
      outColor = u_color;
    }
  `);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Program linking failed');
  return program;
}

function bounds(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const zs = points.map((point) => point.z);
  return {
    minX: Math.min(...xs, 0), maxX: Math.max(...xs, 1),
    minY: Math.min(...ys, 0), maxY: Math.max(...ys, 1),
    minZ: Math.min(...zs, 0), maxZ: Math.max(...zs, 1),
  };
}

function normal(value, min, max) {
  if (max === min) return 0;
  return ((value - min) / (max - min)) * 1.6 - 0.8;
}

function pointPosition(point, box) {
  return [normal(point.x, box.minX, box.maxX), normal(point.z, box.minZ, box.maxZ), normal(point.y, box.minY, box.maxY) * 0.25];
}

export function createTrustscapeRenderer(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
  if (!gl) return null;
  const program = createProgram(gl);
  const position = gl.getAttribLocation(program, 'a_position');
  const color = gl.getUniformLocation(program, 'u_color');
  const pointSize = gl.getUniformLocation(program, 'u_pointSize');
  const buffer = gl.createBuffer();

  function draw(vertices, mode, rgba, size = 4) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
    gl.uniform4fv(color, rgba);
    gl.uniform1f(pointSize, size);
    gl.drawArrays(mode, 0, vertices.length / 3);
  }

  function render(scene, view = {}) {
    const activeBranches = new Set(view.activeBranches ?? scene.branchIds ?? scene.points.map((point) => point.branchId));
    const maxTime = Number.isSafeInteger(view.maxTime) ? view.maxTime : Number.MAX_SAFE_INTEGER;
    const visible = scene.points.filter((point) => activeBranches.has(point.branchId) && point.t <= maxTime);
    const box = bounds(scene.points);
    const pointByReceipt = new Map(scene.points.map((point) => [point.receiptNodeId, point]));

    canvas.width = Math.max(1, Math.floor(canvas.clientWidth * devicePixelRatio));
    canvas.height = Math.max(1, Math.floor(canvas.clientHeight * devicePixelRatio));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.025, 0.035, 0.055, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);

    const lineVertices = [];
    for (const thread of scene.receiptThreads) {
      const from = pointByReceipt.get(thread.from);
      const to = pointByReceipt.get(thread.to);
      if (!from || !to || !activeBranches.has(from.branchId) || !activeBranches.has(to.branchId) || from.t > maxTime || to.t > maxTime) continue;
      lineVertices.push(...pointPosition(from, box), ...pointPosition(to, box));
    }
    if (lineVertices.length) draw(lineVertices, gl.LINES, [0.36, 0.52, 0.72, 0.55], 1);

    const pointVertices = visible.flatMap((point) => pointPosition(point, box));
    if (pointVertices.length) draw(pointVertices, gl.POINTS, [0.77, 0.91, 1, 1], 7);
  }

  return Object.freeze({ render });
}
