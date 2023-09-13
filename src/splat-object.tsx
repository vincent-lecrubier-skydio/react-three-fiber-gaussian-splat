import { useEffect, useRef, useState } from 'react';
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

const worker = new SplatSortWorker();

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

export function Splat() {
  const ref = useRef(null);

  const { size, camera, viewport } = useThree();

  const [{ rawShaderMaterialData, instancedBufferGeometryData }] = useState(
    () => {
      const rawShaderMaterialData: Overwrite<
        Partial<THREE.RawShaderMaterial>,
        NodeProps<THREE.RawShaderMaterial, [THREE.ShaderMaterialParameters]>
      > = {
        uniforms: {
          viewport: {
            value: new THREE.Vector2(
              size.width * viewport.dpr,
              size.height * viewport.dpr
            ),
          },
          focal: { value: computeFocalLengths(size, camera) },
        },
        fragmentShader: fragmentShaderSource,
        vertexShader: vertexShaderSource,

        // Original Version
        // Good: Specific correct blending mode
        // Bad: Does not interact with ThreeJS depth
        // Use in conjunction with the Original version of gl_FragColor in the fragment shader
        depthTest: false,
        depthWrite: false,
        transparent: true,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendEquationAlpha: THREE.AddEquation,
        blendSrc: THREE.OneMinusDstAlphaFactor,
        blendDst: THREE.OneFactor,
        blendSrcAlpha: THREE.OneMinusDstAlphaFactor,
        blendDstAlpha: THREE.OneFactor,

        // // Vincent customization
        // // Good: Use alpha to coverage to manage transparency nicely with ThreeJS
        // // Bad: Might be a performance hit? And blending artifacts due to using MSAA for transparency
        // // Use in conjunction with the Vincent customization of gl_FragColor in the fragment shader
        // blending: THREE.NormalBlending,
        // depthTest: true,
        // depthWrite: true,
        // transparent: true,
        // alphaToCoverage: true,
      };

      const instancedBufferGeometryData: Overwrite<
        Partial<THREE.InstancedBufferGeometry>,
        NodeProps<
          THREE.InstancedBufferGeometry,
          typeof THREE.InstancedBufferGeometry
        >
      > = {
        index: new THREE.BufferAttribute(
          new Uint16Array([0, 1, 2, 2, 3, 0]),
          1
        ),
        attributes: {
          position: new THREE.BufferAttribute(
            new Float32Array([1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 0]),
            3
          ),
          color: new THREE.InstancedBufferAttribute(
            // new Float32Array([1, 0, 1, 1, 1, 1, 0, 1]),
            new Float32Array([1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1]),
            4
          ),
          quat: new THREE.InstancedBufferAttribute(
            // new Float32Array([0, 0, 0, 1, 0, 0, 0, 1]),
            new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]),
            4
          ),
          scale: new THREE.InstancedBufferAttribute(
            // new Float32Array([1, 1, 1, 2, 0.5, 0.5]),
            new Float32Array([1, 1, 1, 2, 0.5, 0.5, 0.5, 2, 2, 0.5, 0.5, 0.5]),
            3
          ),
          center: new THREE.InstancedBufferAttribute(
            // new Float32Array([0, 0, 0, 2, 0, 0]),
            new Float32Array([0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2]),
            3
          ),
        },
      };

      return {
        rawShaderMaterialData,
        instancedBufferGeometryData,
      };
    }
  );

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
      worker.onmessage = (e) => {
        let { quat, scale, center, color } = e.data;
        vertexCount = quat.length / 4;
        const mesh = ref.current as unknown as THREE.Mesh;
        const geometry = mesh.geometry;
        // if (geometry.getAttribute('quat').array.length !== quat.length) {
        //   console.log('RESIZEEEE TO ', quat.length);
        //   geometry.setAttribute('quat', new THREE.BufferAttribute(quat, 4));
        //   geometry.setAttribute('color', new THREE.BufferAttribute(color, 4));
        //   geometry.setAttribute('scale', new THREE.BufferAttribute(scale, 3));
        //   geometry.setAttribute('center', new THREE.BufferAttribute(center, 3));
        //   geometry.setDrawRange(0, vertexCount);
        // } else {
        //   geometry.getAttribute('quat').array.set(quat);
        //   geometry.getAttribute('color').array.set(color);
        //   geometry.getAttribute('scale').array.set(scale);
        //   geometry.getAttribute('center').array.set(center);
        // }
        // geometry.getAttribute('quat').needsUpdate = true;
        // geometry.getAttribute('color').needsUpdate = true;
        // geometry.getAttribute('scale').needsUpdate = true;
        // geometry.getAttribute('center').needsUpdate = true;

        vertexCount = 4;
        geometry.setAttribute(
          'quat',
          new THREE.InstancedBufferAttribute(
            new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]),
            4
          )
        );
        geometry.setAttribute(
          'color',
          new THREE.InstancedBufferAttribute(
            new Float32Array([1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1]),
            4
          )
        );
        geometry.setAttribute(
          'scale',
          new THREE.InstancedBufferAttribute(
            new Float32Array([1, 1, 1, 2, 0.5, 0.5, 0.5, 2, 2, 0.5, 0.5, 0.5]),
            3
          )
        );
        geometry.setAttribute(
          'center',
          new THREE.InstancedBufferAttribute(
            new Float32Array([0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2]),
            3
          )
        );
        geometry.setDrawRange(0, vertexCount * 2);

        // geometry.getAttribute('quat').needsUpdate = true;
        // geometry.getAttribute('color').needsUpdate = true;
        // geometry.getAttribute('scale').needsUpdate = true;
        // geometry.getAttribute('center').needsUpdate = true;
      };
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

  return (
    <mesh ref={ref}>
      <instancedBufferGeometry {...instancedBufferGeometryData} />
      <rawShaderMaterial {...rawShaderMaterialData} />
    </mesh>
  );
}
