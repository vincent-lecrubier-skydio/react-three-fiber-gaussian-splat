import { useRef, useState } from 'react';
import * as THREE from 'three';
// import SplatSortWorker from './splat-sort-worker?worker';
import { fragmentShaderSource, vertexShaderSource } from './splat-shaders';
import { NodeProps, Overwrite, Size, useThree } from '@react-three/fiber';

function computeFocalLengths(size: Size, camera: THREE.Camera) {
  // Ensure the camera is a PerspectiveCamera
  if (!(camera instanceof THREE.PerspectiveCamera)) {
    console.error('The provided camera is not a THREE.PerspectiveCamera');
    return null;
  }
  // Convert fov from degrees to radians
  const fovRad = THREE.MathUtils.degToRad(camera.fov);
  // Calculate focal length for y-direction
  const fy = size.height / (2 * Math.tan(fovRad / 2));
  // Calculate horizontal field of view in radians
  const fovXRad = 2 * Math.atan(Math.tan(fovRad / 2) * camera.aspect);
  // Calculate focal length for x-direction
  const fx = size.width / (2 * Math.tan(fovXRad / 2));
  return new THREE.Vector2(fx, fy);
}

export function Splat() {
  const ref = useRef();

  const { size, camera, viewport } = useThree();

  const [{ rawShaderMaterialData, instancedBufferGeometryData }] = useState(
    () => {
      // const worker = new SplatSortWorker();

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

        // // Original Version
        // // Specific correct blending mode, but does not interact with ThreeJS depth
        // // Use in conjunction with the Original version of gl_FragColor in the fragment shader
        // depthTest: false,
        // depthWrite: false,
        // transparent: true,
        // blending: THREE.CustomBlending,
        // blendEquation: THREE.AddEquation,
        // blendEquationAlpha: THREE.AddEquation,
        // blendSrc: THREE.OneMinusDstAlphaFactor,
        // blendDst: THREE.OneFactor,
        // blendSrcAlpha: THREE.OneMinusDstAlphaFactor,
        // blendDstAlpha: THREE.OneFactor,

        // Vincent customization
        // No customization, use defaults
        // // Use in conjunction with the Vincent customization of gl_FragColor in the fragment shader
        blending: THREE.NormalBlending,
        depthTest: true,
        depthWrite: true,
        transparent: true,
        alphaToCoverage: true,
      };

      const position = new THREE.BufferAttribute(
        new Float32Array([1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 1, 0]),
        3
      );

      const index = new THREE.BufferAttribute(
        new Uint16Array([0, 1, 2, 2, 3, 0]),
        1
      );

      const color = new THREE.InstancedBufferAttribute(
        new Float32Array([1, 0, 1, 1, 1, 1, 0, 1]),
        4
      );
      const quat = new THREE.InstancedBufferAttribute(
        new Float32Array([0, 0, 0, 1, 0, 0, 0, 1]),
        4
      );
      const scale = new THREE.InstancedBufferAttribute(
        new Float32Array([1, 1, 1, 2, 0.5, 0.5]),
        3
      );
      const center = new THREE.InstancedBufferAttribute(
        new Float32Array([0, 0, 0, 2, 0, 0]),
        3
      );

      const instancedBufferGeometryData: Overwrite<
        Partial<THREE.InstancedBufferGeometry>,
        NodeProps<
          THREE.InstancedBufferGeometry,
          typeof THREE.InstancedBufferGeometry
        >
      > = {
        index,
        attributes: {
          position: position,
          center: center,
          color: color,
          quat: quat,
          scale: scale,
        },
      };

      return { rawShaderMaterialData, instancedBufferGeometryData };
    }
  );

  return (
    <mesh ref={ref}>
      <instancedBufferGeometry {...instancedBufferGeometryData} />
      <rawShaderMaterial {...rawShaderMaterialData} />
    </mesh>
  );
}
