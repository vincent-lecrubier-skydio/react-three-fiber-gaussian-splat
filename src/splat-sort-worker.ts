/// <reference lib="WebWorker" />

type ViewProj = number[];
let maxSplats: number = Infinity;
let buffer: ArrayBuffer;
let vertexCount = 0;
let viewProj: ViewProj;
// 6*4 + 4 + 4 = 8*4
// XYZ - Position (Float32)
// XYZ - Scale (Float32)
// RGBA - colors (uint8)
// IJKL - quaternion/rot (uint8)
const rowLength = 3 * 4 + 3 * 4 + 4 + 4;
let depthMix = new BigInt64Array();
let lastProj: ViewProj = [];

const runSort = (viewProj: ViewProj) => {
  if (!buffer) return;

  // console.time("sort");

  const effectiveVertexCount = Math.min(vertexCount, maxSplats);

  const f_buffer = new Float32Array(buffer);
  const u_buffer = new Uint8Array(buffer);

  const quat = new Float32Array(4 * effectiveVertexCount);
  const scale = new Float32Array(3 * effectiveVertexCount);
  const center = new Float32Array(3 * effectiveVertexCount);
  const color = new Float32Array(4 * effectiveVertexCount);

  if (depthMix.length !== effectiveVertexCount) {
    depthMix = new BigInt64Array(effectiveVertexCount);
    const indexMix = new Uint32Array(depthMix.buffer);
    for (let j = 0; j < effectiveVertexCount; j++) {
      indexMix[2 * j] = j;
    }
  } else {
    let dot =
      lastProj[2] * viewProj[2] +
      lastProj[6] * viewProj[6] +
      lastProj[10] * viewProj[10];
    if (Math.abs(dot - 1) < 0.01) {
      return;
    }
  }
  // console.time("sort");

  const floatMix = new Float32Array(depthMix.buffer);
  const indexMix = new Uint32Array(depthMix.buffer);

  for (let j = 0; j < effectiveVertexCount; j++) {
    let i = indexMix[2 * j];
    floatMix[2 * j + 1] =
      10000 -
      (viewProj[2] * f_buffer[8 * i + 0] +
        viewProj[6] * f_buffer[8 * i + 1] +
        viewProj[10] * f_buffer[8 * i + 2]);
  }

  lastProj = viewProj;

  depthMix.sort();

  for (let j = 0; j < effectiveVertexCount; j++) {
    const i = indexMix[2 * j];

    quat[4 * j + 0] = (u_buffer[32 * i + 28 + 0] - 128) / 128;
    quat[4 * j + 1] = (u_buffer[32 * i + 28 + 1] - 128) / 128;
    quat[4 * j + 2] = (u_buffer[32 * i + 28 + 2] - 128) / 128;
    quat[4 * j + 3] = (u_buffer[32 * i + 28 + 3] - 128) / 128;

    center[3 * j + 0] = f_buffer[8 * i + 0];
    center[3 * j + 1] = f_buffer[8 * i + 1];
    center[3 * j + 2] = f_buffer[8 * i + 2];

    color[4 * j + 0] = u_buffer[32 * i + 24 + 0] / 255;
    color[4 * j + 1] = u_buffer[32 * i + 24 + 1] / 255;
    color[4 * j + 2] = u_buffer[32 * i + 24 + 2] / 255;
    color[4 * j + 3] = u_buffer[32 * i + 24 + 3] / 255;

    scale[3 * j + 0] = f_buffer[8 * i + 3 + 0];
    scale[3 * j + 1] = f_buffer[8 * i + 3 + 1];
    scale[3 * j + 2] = f_buffer[8 * i + 3 + 2];
  }

  self.postMessage({ quat, center, color, scale, viewProj }, [
    quat.buffer,
    center.buffer,
    color.buffer,
    scale.buffer,
  ]);

  // console.timeEnd("sort");
};

const throttledSort = () => {
  if (!sortRunning) {
    sortRunning = true;
    let lastView = viewProj;
    runSort(lastView);
    setTimeout(() => {
      sortRunning = false;
      if (lastView !== viewProj) {
        throttledSort();
      }
    }, 0);
  }
};

let sortRunning: boolean;
self.onmessage = (e) => {
  if (e.data.buffer) {
    buffer = e.data.buffer;
    vertexCount = e.data.vertexCount;
  } else if (e.data.vertexCount) {
    vertexCount = e.data.vertexCount;
  } else if (e.data.view) {
    viewProj = e.data.view;
    maxSplats = e.data.maxSplats;
    throttledSort();
  }
};
