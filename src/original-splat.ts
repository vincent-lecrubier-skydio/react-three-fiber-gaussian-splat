import SplatSortWorker from './splat-sort-worker?worker';
import { fragmentShaderSource, vertexShaderSource } from './splat-shaders';

let cameras = [
  {
    id: 0,
    img_name: '00001',
    width: 1959,
    height: 1090,
    position: [-3.0089893469241797, -0.11086489695181866, -3.7527640949141428],
    rotation: [
      [0.876134201218856, 0.06925962026449776, 0.47706599800804744],
      [-0.04747421839895102, 0.9972110940209488, -0.057586739349882114],
      [-0.4797239414934443, 0.027805376500959853, 0.8769787916452908],
    ],
    fy: 1164.6601287484507,
    fx: 1159.5880733038064,
  },
];

const camera = cameras[0];

function getProjectionMatrix(
  fx: number,
  fy: number,
  width: number,
  height: number
) {
  const znear = 0.2;
  const zfar = 200;
  return [
    [(2 * fx) / width, 0, 0, 0],
    [0, (2 * fy) / height, 0, 0],
    [0, 0, zfar / (zfar - znear), 1],
    [0, 0, -(zfar * znear) / (zfar - znear), 0],
  ].flat();
}

function multiply4(a, b) {
  return [
    b[0] * a[0] + b[1] * a[4] + b[2] * a[8] + b[3] * a[12],
    b[0] * a[1] + b[1] * a[5] + b[2] * a[9] + b[3] * a[13],
    b[0] * a[2] + b[1] * a[6] + b[2] * a[10] + b[3] * a[14],
    b[0] * a[3] + b[1] * a[7] + b[2] * a[11] + b[3] * a[15],
    b[4] * a[0] + b[5] * a[4] + b[6] * a[8] + b[7] * a[12],
    b[4] * a[1] + b[5] * a[5] + b[6] * a[9] + b[7] * a[13],
    b[4] * a[2] + b[5] * a[6] + b[6] * a[10] + b[7] * a[14],
    b[4] * a[3] + b[5] * a[7] + b[6] * a[11] + b[7] * a[15],
    b[8] * a[0] + b[9] * a[4] + b[10] * a[8] + b[11] * a[12],
    b[8] * a[1] + b[9] * a[5] + b[10] * a[9] + b[11] * a[13],
    b[8] * a[2] + b[9] * a[6] + b[10] * a[10] + b[11] * a[14],
    b[8] * a[3] + b[9] * a[7] + b[10] * a[11] + b[11] * a[15],
    b[12] * a[0] + b[13] * a[4] + b[14] * a[8] + b[15] * a[12],
    b[12] * a[1] + b[13] * a[5] + b[14] * a[9] + b[15] * a[13],
    b[12] * a[2] + b[13] * a[6] + b[14] * a[10] + b[15] * a[14],
    b[12] * a[3] + b[13] * a[7] + b[14] * a[11] + b[15] * a[15],
  ];
}

function invert4(a) {
  let b00 = a[0] * a[5] - a[1] * a[4];
  let b01 = a[0] * a[6] - a[2] * a[4];
  let b02 = a[0] * a[7] - a[3] * a[4];
  let b03 = a[1] * a[6] - a[2] * a[5];
  let b04 = a[1] * a[7] - a[3] * a[5];
  let b05 = a[2] * a[7] - a[3] * a[6];
  let b06 = a[8] * a[13] - a[9] * a[12];
  let b07 = a[8] * a[14] - a[10] * a[12];
  let b08 = a[8] * a[15] - a[11] * a[12];
  let b09 = a[9] * a[14] - a[10] * a[13];
  let b10 = a[9] * a[15] - a[11] * a[13];
  let b11 = a[10] * a[15] - a[11] * a[14];
  let det =
    b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) throw new Error("Can't invert");
  return [
    (a[5] * b11 - a[6] * b10 + a[7] * b09) / det,
    (a[2] * b10 - a[1] * b11 - a[3] * b09) / det,
    (a[13] * b05 - a[14] * b04 + a[15] * b03) / det,
    (a[10] * b04 - a[9] * b05 - a[11] * b03) / det,
    (a[6] * b08 - a[4] * b11 - a[7] * b07) / det,
    (a[0] * b11 - a[2] * b08 + a[3] * b07) / det,
    (a[14] * b02 - a[12] * b05 - a[15] * b01) / det,
    (a[8] * b05 - a[10] * b02 + a[11] * b01) / det,
    (a[4] * b10 - a[5] * b08 + a[7] * b06) / det,
    (a[1] * b08 - a[0] * b10 - a[3] * b06) / det,
    (a[12] * b04 - a[13] * b02 + a[15] * b00) / det,
    (a[9] * b02 - a[8] * b04 - a[11] * b00) / det,
    (a[5] * b07 - a[4] * b09 - a[6] * b06) / det,
    (a[0] * b09 - a[1] * b07 + a[2] * b06) / det,
    (a[13] * b01 - a[12] * b03 - a[14] * b00) / det,
    (a[8] * b03 - a[9] * b01 + a[10] * b00) / det,
  ];
}

function rotate4(a, rad, x, y, z) {
  let len = Math.hypot(x, y, z);
  x /= len;
  y /= len;
  z /= len;
  let s = Math.sin(rad);
  let c = Math.cos(rad);
  let t = 1 - c;
  let b00 = x * x * t + c;
  let b01 = y * x * t + z * s;
  let b02 = z * x * t - y * s;
  let b10 = x * y * t - z * s;
  let b11 = y * y * t + c;
  let b12 = z * y * t + x * s;
  let b20 = x * z * t + y * s;
  let b21 = y * z * t - x * s;
  let b22 = z * z * t + c;
  return [
    a[0] * b00 + a[4] * b01 + a[8] * b02,
    a[1] * b00 + a[5] * b01 + a[9] * b02,
    a[2] * b00 + a[6] * b01 + a[10] * b02,
    a[3] * b00 + a[7] * b01 + a[11] * b02,
    a[0] * b10 + a[4] * b11 + a[8] * b12,
    a[1] * b10 + a[5] * b11 + a[9] * b12,
    a[2] * b10 + a[6] * b11 + a[10] * b12,
    a[3] * b10 + a[7] * b11 + a[11] * b12,
    a[0] * b20 + a[4] * b21 + a[8] * b22,
    a[1] * b20 + a[5] * b21 + a[9] * b22,
    a[2] * b20 + a[6] * b21 + a[10] * b22,
    a[3] * b20 + a[7] * b21 + a[11] * b22,
    ...a.slice(12, 16),
  ];
}

function translate4(a, x, y, z) {
  return [
    ...a.slice(0, 12),
    a[0] * x + a[4] * y + a[8] * z + a[12],
    a[1] * x + a[5] * y + a[9] * z + a[13],
    a[2] * x + a[6] * y + a[10] * z + a[14],
    a[3] * x + a[7] * y + a[11] * z + a[15],
  ];
}

let defaultViewMatrix = [
  0.47, 0.04, 0.88, 0, -0.11, 0.99, 0.02, 0, -0.88, -0.11, 0.47, 0, 0.07, 0.03,
  6.55, 1,
];
let viewMatrix = defaultViewMatrix;

export async function main() {
  console.log('MAINN');

  const params = new URLSearchParams(location.search);
  try {
    viewMatrix = JSON.parse(decodeURIComponent(location.hash.slice(1)));
  } catch (err) {}
  const url = new URL(
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

  const worker = new SplatSortWorker();
  // const worker = new Worker(
  //   URL.createObjectURL(
  //     new Blob(['(', createWorker.toString(), ')(self)'], {
  //       type: 'application/javascript',
  //     })
  //   )
  // );

  const canvas = document.createElement('canvas');
  canvas.width = innerWidth / 2;
  canvas.height = innerHeight / 2;
  canvas.style.position = 'absolute';
  canvas.style.top = 0;
  canvas.style.left = 0;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  document.body.appendChild(canvas);

  const fps = document.createElement('div');
  fps.style.position = 'absolute';
  fps.style.bottom = '10px';
  fps.style.right = '10px';
  document.body.appendChild(fps);

  let projectionMatrix = getProjectionMatrix(
    camera.fx / 2,
    camera.fy / 2,
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

  /////////////////////////////////////////////////////

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
      let { quat, scale, center, color } = e.data;
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

  let startX, startY, down;

  let vertexCount = 0;

  let lastFrame = 0;
  let avgFps = 0;
  let start = Date.now() + 2000;

  const frame = (now) => {
    let inv = invert4(viewMatrix);
    // let preY = inv[13];

    // inv[13] = preY;
    viewMatrix = invert4(inv);

    let actualViewMatrix = viewMatrix;

    const viewProj = multiply4(projectionMatrix, actualViewMatrix);
    worker.postMessage({ view: viewProj });

    const currentFps = 1000 / (now - lastFrame) || 0;
    avgFps = avgFps * 0.9 + currentFps * 0.1;

    if (vertexCount > 0) {
      // document.getElementById('spinner').style.display = 'none';
      gl.uniformMatrix4fv(u_view, false, actualViewMatrix);
      ext.drawArraysInstancedANGLE(gl.TRIANGLE_STRIP, 0, 4, vertexCount);
    } else {
      gl.clear(gl.COLOR_BUFFER_BIT);
      // document.getElementById('spinner').style.display = '';
    }
    const progress = (100 * vertexCount) / (splatData.length / rowLength);
    if (progress < 100) {
      // document.getElementById('progress').style.width = progress + '%';
    } else {
      // document.getElementById('progress').style.display = 'none';
    }
    fps.innerText = Math.round(avgFps) + ' fps';
    lastFrame = now;
    requestAnimationFrame(frame);
  };

  frame();

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
  if (!stopLoading) {
    worker.postMessage({
      buffer: splatData.buffer,
      vertexCount: Math.floor(bytesRead / rowLength),
    });
  }
}
