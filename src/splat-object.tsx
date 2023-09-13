import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import SplatSortWorker from './splat-sort-worker?worker';
import { fragmentShaderSource, vertexShaderSource } from './splat-shaders';
import {
  NodeProps,
  Overwrite,
  Size,
  useFrame,
  useThree,
} from '@react-three/fiber';

const computeFocalLengths = (size: Size, camera: THREE.Camera) => {
  if (!(camera instanceof THREE.PerspectiveCamera)) {
    throw new Error('The provided camera is not a THREE.PerspectiveCamera');
  }
  const fovRad = THREE.MathUtils.degToRad(camera.fov);
  const fovXRad = 2 * Math.atan(Math.tan(fovRad / 2) * camera.aspect);
  const fy = size.height / (2 * Math.tan(fovRad / 2));
  const fx = size.width / (2 * Math.tan(fovXRad / 2));
  return new THREE.Vector2(fx, fy);
};

const FocalUniform = ({
  size,
  camera,
  ...props
}: {
  size: Size;
  camera: THREE.Camera;
} & Overwrite<
  Partial<THREE.Vector2>,
  NodeProps<THREE.Vector2, typeof THREE.Vector2>
>) => {
  if (!(camera instanceof THREE.PerspectiveCamera)) {
    throw new Error('The provided camera is not a THREE.PerspectiveCamera');
  }
  const fovRad = THREE.MathUtils.degToRad(camera.fov);
  const fovXRad = 2 * Math.atan(Math.tan(fovRad / 2) * camera.aspect);
  const fy = size.height / (2 * Math.tan(fovRad / 2));
  const fx = size.width / (2 * Math.tan(fovXRad / 2));
  return <vector2 {...props} x={fx} y={fy} />;
};

export function Splat() {
  const ref = useRef(null);

  const [worker] = useState(() => new SplatSortWorker());

  const { size, camera, viewport } = useThree();

  const [uniforms, setUniforms] = useState({
    viewport: {
      value: new THREE.Vector2(
        size.width * viewport.dpr,
        size.height * viewport.dpr
      ),
    },
    focal: {
      value: computeFocalLengths(size, camera),
    },
  });

  const [buffers, setBuffers] = useState({
    index: new Uint16Array([0, 1, 2, 2, 3, 0]),
    position: new Float32Array([1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 0]),
    color: new Float32Array([1, 0, 1, 1, 1, 1, 0, 1]),
    quat: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1]),
    scale: new Float32Array([1, 1, 1, 2, 0.5, 0.5]),
    center: new Float32Array([0, 0, 0, 2, 0, 0]),
  });

  useFrame((state, _delta, _xrFrame) => {
    // TODO FIXME Not sure about state.camera.modelViewMatrix here
    // const viewProj = multiply4(projectionMatrix, actualViewMatrix);
    // worker.postMessage({
    //   view: [
    //     0.47, 0.04, 0.88, 0, -0.11, 0.99, 0.02, 0, -0.88, -0.11, 0.47, 0, 0.07,
    //     0.03, 6.55, 1,
    //   ],
    // });

    const mesh = ref.current as unknown as THREE.Mesh;
    const camera = state.camera;
    const viewProj = new THREE.Matrix4()
      .multiply(camera.projectionMatrix)
      .multiply(camera.matrixWorldInverse)
      .multiply(mesh.matrixWorld);
    worker.postMessage({ view: viewProj.elements });
  });

  useEffect(() => {
    worker.onmessage = (e) => {
      console.log(e);
      let { quat, scale, center, color } = e.data;
      setBuffers((buffers) => ({ ...buffers, quat, scale, center, color }));
    };
    return () => {
      worker.onmessage = null;
    };
  });

  useEffect(() => {
    const loadModel = async () => {
      const url = new URL('https://antimatter15.com/splat-data/train.splat');
      const req = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
      });
      if (
        req.status != 200 ||
        req.body == null ||
        req.headers == null ||
        req.headers.get('content-length') == null
      ) {
        throw new Error(req.status + ' Unable to load ' + req.url);
      }
      const rowLength = 3 * 4 + 3 * 4 + 4 + 4;
      const reader = req.body.getReader();
      let splatData = new Uint8Array(
        parseInt(req.headers.get('content-length')!)
      );
      let vertexCount = 0;
      let lastVertexCount = -1;
      let bytesRead = 0;
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
    };
    loadModel();
  }, []);

  // useEffect(() => {
  //   setTimeout(() => {
  //     // console.log(buffers);
  //     setBuffers({
  //       ...buffers,
  //       color: new Float32Array([
  //         1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1,
  //       ]),
  //       quat: new Float32Array([
  //         0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1,
  //       ]),
  //       scale: new Float32Array([
  //         1, 1, 1, 2, 0.5, 0.5, 0.5, 2, 2, 0.5, 0.5, 0.5,
  //       ]),
  //       center: new Float32Array([0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2]),
  //     });
  //   }, 1000);
  // }, []);

  const instanceCount = buffers.quat.length / 4;
  console.log(instanceCount);

  const update = useCallback(
    (self: THREE.InstancedBufferAttribute | THREE.BufferAttribute) => {
      self.needsUpdate = true;
      // self.parent?.computeBoundingSphere();
    },
    []
  );

  return (
    <mesh ref={ref} renderOrder={10}>
      <instancedBufferGeometry
        key={instanceCount}
        instanceCount={instanceCount}
      >
        <bufferAttribute
          attach="index"
          onUpdate={update}
          array={buffers.index}
          itemSize={1}
          count={6}
        />
        <bufferAttribute
          attach="attributes-position"
          onUpdate={update}
          array={buffers.position}
          itemSize={3}
          count={4}
        />
        <instancedBufferAttribute
          attach="attributes-color"
          onUpdate={update}
          array={buffers.color}
          itemSize={4}
          count={instanceCount}
        />
        <instancedBufferAttribute
          attach="attributes-quat"
          onUpdate={update}
          array={buffers.quat}
          itemSize={4}
          count={instanceCount}
        />
        <instancedBufferAttribute
          attach="attributes-scale"
          onUpdate={update}
          array={buffers.scale}
          itemSize={3}
          count={instanceCount}
        />
        <instancedBufferAttribute
          attach="attributes-center"
          onUpdate={update}
          array={buffers.center}
          itemSize={3}
          count={instanceCount}
        />
      </instancedBufferGeometry>
      {/* <rawShaderMaterial
        uniforms={uniforms}
        fragmentShader={fragmentShaderSource}
        vertexShader={vertexShaderSource}
        depthTest={false}
        depthWrite={false}
        transparent={true}
        blending={THREE.CustomBlending}

        blendSrc={THREE.OneMinusDstAlphaFactor}
        blendSrcAlpha={THREE.OneMinusDstAlphaFactor}
        
        blendDst={THREE.OneFactor}
        blendDstAlpha={THREE.OneFactor}

        blendEquation={THREE.AddEquation}
        blendEquationAlpha={THREE.AddEquation}
      /> */}
      {/* <rawShaderMaterial
        uniforms={uniforms}
        fragmentShader={fragmentShaderSource}
        vertexShader={vertexShaderSource}
        depthTest={false}
        depthWrite={false}
        transparent={true}
        blending={THREE.CustomBlending}
        blendEquation={THREE.AddEquation}
        blendEquationAlpha={THREE.AddEquation}
        blendSrc={THREE.OneMinusDstAlphaFactor}
        blendDst={THREE.OneFactor}
        blendSrcAlpha={THREE.OneMinusDstAlphaFactor}
        blendDstAlpha={THREE.OneFactor}
      /> */}
      {/* <rawShaderMaterial
        uniforms={uniforms}
        fragmentShader={fragmentShaderSource}
        vertexShader={vertexShaderSource}
        blending={THREE.NormalBlending}
        depthTest={true}
        depthWrite={true}
        transparent={true}
        alphaToCoverage={true}
      /> */}
      <rawShaderMaterial
        uniforms={uniforms}
        fragmentShader={fragmentShaderSource}
        vertexShader={vertexShaderSource}
        depthTest={true}
        depthWrite={false}
        transparent={false}

        // blending={THREE.CustomBlending}
        // blendSrc={THREE.OneMinusDstAlphaFactor}
        // blendSrcAlpha={THREE.OneMinusDstAlphaFactor}
        // blendDst={THREE.OneFactor}
        // blendDstAlpha={THREE.OneFactor}
        // blendEquation={THREE.AddEquation}
        // blendEquationAlpha={THREE.AddEquation}
      />
    </mesh>
  );
}
