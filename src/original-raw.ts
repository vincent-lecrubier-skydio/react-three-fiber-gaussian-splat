let defaultViewMatrix = [
  0.47, 0.04, 0.88, 0, -0.11, 0.99, 0.02, 0, -0.88, -0.11, 0.47, 0, 0.07, 0.03,
  6.55, 1,
];
let viewMatrix = defaultViewMatrix;

async function main() {
  let carousel = true;
  const params = new URLSearchParams(location.search);
  try {
    viewMatrix = JSON.parse(decodeURIComponent(location.hash.slice(1)));
    carousel = false;
  } catch (err) {}
  const url = new URL(
    // "nike.splat",
    // location.href,
    params.get('url') || 'train.splat',
    'https://antimatter15.com/splat-data/'
  );
  const req = await fetch(url, {
    mode: 'cors', // no-cors, *cors, same-origin
    credentials: 'omit', // include, *same-origin, omit
  });
  console.log(req);
  if (req.status != 200)
    throw new Error(req.status + ' Unable to load ' + req.url);

  const rowLength = 3 * 4 + 3 * 4 + 4 + 4;
  const reader = req.body.getReader();
  let splatData = new Uint8Array(req.headers.get('content-length'));

  const downsample = splatData.length / rowLength > 500000 ? 2 : 1;
  console.log(splatData.length / rowLength, downsample);

  const worker = new Worker(
    URL.createObjectURL(
      new Blob(['(', createWorker.toString(), ')(self)'], {
        type: 'application/javascript',
      })
    )
  );

  const canvas = document.getElementById('canvas');
  canvas.width = innerWidth / downsample;
  canvas.height = innerHeight / downsample;

  const fps = document.getElementById('fps');

  let projectionMatrix = getProjectionMatrix(
    camera.fx / downsample,
    camera.fy / downsample,
    canvas.width,
    canvas.height
  );

  const gl = canvas.getContext('webgl');
  const ext = gl.getExtension('ANGLE_instanced_arrays');

  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertexShaderSource);
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
    console.error(gl.getShaderInfoLog(vertexShader));

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fragmentShaderSource);
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
    console.error(gl.getShaderInfoLog(fragmentShader));

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.useProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    console.error(gl.getProgramInfoLog(program));

  gl.disable(gl.DEPTH_TEST); // Disable depth testing

  // Enable blending
  gl.enable(gl.BLEND);

  // Set blending function
  gl.blendFuncSeparate(
    gl.ONE_MINUS_DST_ALPHA,
    gl.ONE,
    gl.ONE_MINUS_DST_ALPHA,
    gl.ONE
  );

  // Set blending equation
  gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);

  // projection
  const u_projection = gl.getUniformLocation(program, 'projection');
  gl.uniformMatrix4fv(u_projection, false, projectionMatrix);

  // viewport
  const u_viewport = gl.getUniformLocation(program, 'viewport');
  gl.uniform2fv(u_viewport, new Float32Array([canvas.width, canvas.height]));

  // focal
  const u_focal = gl.getUniformLocation(program, 'focal');
  gl.uniform2fv(
    u_focal,
    new Float32Array([camera.fx / downsample, camera.fy / downsample])
  );

  // view
  const u_view = gl.getUniformLocation(program, 'view');
  gl.uniformMatrix4fv(u_view, false, viewMatrix);

  // positions
  const triangleVertices = new Float32Array([1, -1, 1, 1, -1, 1, -1, -1]);
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
  const a_position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(a_position);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

  // center
  const centerBuffer = gl.createBuffer();
  // gl.bindBuffer(gl.ARRAY_BUFFER, centerBuffer);
  // gl.bufferData(gl.ARRAY_BUFFER, center, gl.STATIC_DRAW);
  const a_center = gl.getAttribLocation(program, 'center');
  gl.enableVertexAttribArray(a_center);
  gl.bindBuffer(gl.ARRAY_BUFFER, centerBuffer);
  gl.vertexAttribPointer(a_center, 3, gl.FLOAT, false, 0, 0);
  ext.vertexAttribDivisorANGLE(a_center, 1); // Use the extension here

  // color
  const colorBuffer = gl.createBuffer();
  // gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  // gl.bufferData(gl.ARRAY_BUFFER, color, gl.STATIC_DRAW);
  const a_color = gl.getAttribLocation(program, 'color');
  gl.enableVertexAttribArray(a_color);
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.vertexAttribPointer(a_color, 4, gl.FLOAT, false, 0, 0);
  ext.vertexAttribDivisorANGLE(a_color, 1); // Use the extension here

  // quat
  const quatBuffer = gl.createBuffer();
  // gl.bindBuffer(gl.ARRAY_BUFFER, quatBuffer);
  // gl.bufferData(gl.ARRAY_BUFFER, quat, gl.STATIC_DRAW);
  const a_quat = gl.getAttribLocation(program, 'quat');
  gl.enableVertexAttribArray(a_quat);
  gl.bindBuffer(gl.ARRAY_BUFFER, quatBuffer);
  gl.vertexAttribPointer(a_quat, 4, gl.FLOAT, false, 0, 0);
  ext.vertexAttribDivisorANGLE(a_quat, 1); // Use the extension here

  // scale
  const scaleBuffer = gl.createBuffer();
  // gl.bindBuffer(gl.ARRAY_BUFFER, scaleBuffer);
  // gl.bufferData(gl.ARRAY_BUFFER, scale, gl.STATIC_DRAW);
  const a_scale = gl.getAttribLocation(program, 'scale');
  gl.enableVertexAttribArray(a_scale);
  gl.bindBuffer(gl.ARRAY_BUFFER, scaleBuffer);
  gl.vertexAttribPointer(a_scale, 3, gl.FLOAT, false, 0, 0);
  ext.vertexAttribDivisorANGLE(a_scale, 1); // Use the extension here

  let lastProj = [];
  let lastData;

  worker.onmessage = (e) => {
    if (e.data.buffer) {
      splatData = new Uint8Array(e.data.buffer);
      const blob = new Blob([splatData.buffer], {
        type: 'application/octet-stream',
      });
      const link = document.createElement('a');
      link.download = 'model.splat';
      link.href = URL.createObjectURL(blob);
      document.body.appendChild(link);
      link.click();
    } else {
      let { quat, scale, center, color, viewProj } = e.data;
      lastData = e.data;

      lastProj = viewProj;
      vertexCount = quat.length / 4;

      gl.bindBuffer(gl.ARRAY_BUFFER, centerBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, center, gl.STATIC_DRAW);

      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, color, gl.STATIC_DRAW);

      gl.bindBuffer(gl.ARRAY_BUFFER, quatBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, quat, gl.STATIC_DRAW);

      gl.bindBuffer(gl.ARRAY_BUFFER, scaleBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, scale, gl.STATIC_DRAW);
    }
  };

  let vertexCount = 0;

  let bytesRead = 0;
  let lastVertexCount = -1;
  let stopLoading = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done || stopLoading) break;

    splatData.set(value, bytesRead);
    bytesRead += value.length;

    if (vertexCount > lastVertexCount) {
      worker.postMessage({
        buffer: splatData.buffer,
        vertexCount: Math.floor(bytesRead / rowLength),
      });
      lastVertexCount = vertexCount;
    }
  }
  if (!stopLoading)
    worker.postMessage({
      buffer: splatData.buffer,
      vertexCount: Math.floor(bytesRead / rowLength),
    });
}
