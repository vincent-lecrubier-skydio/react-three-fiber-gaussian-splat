import SplatSortWorker from './splat-sort-worker?worker';
import { fragmentShaderSource, vertexShaderSource } from './splat-shaders';




let defaultViewMatrix = [
  0.47, 0.04, 0.88, 0, -0.11, 0.99, 0.02, 0, -0.88, -0.11, 0.47, 0, 0.07, 0.03,
  6.55, 1,
];
let viewMatrix = defaultViewMatrix;

export async function main() {
  
  

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
  if (!stopLoading) {
    worker.postMessage({
      buffer: splatData.buffer,
      vertexCount: Math.floor(bytesRead / rowLength),
    });
  }
}
