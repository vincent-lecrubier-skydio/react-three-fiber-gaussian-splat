import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { FlakesTexture } from 'three-stdlib';
import url from './suzi.gltf';

export const Suzi = ({ objref, ...props }: any) => {
  const { scene, materials } = useGLTF(url) as any;
  useLayoutEffect(() => {
    scene.traverse((obj: THREE.Mesh) => {
      if (!obj.isMesh) return;
      obj.receiveShadow = true;
      obj.castShadow = true;
      objref.current = obj;
    });
    materials.default.color.set('orange');
    materials.default.roughness = 0;
    materials.default.normalMap = new THREE.CanvasTexture(
      new FlakesTexture() as TexImageSource,
      THREE.UVMapping,
      THREE.RepeatWrapping,
      THREE.RepeatWrapping
    );
    materials.default.normalMap.repeat.set(40, 40);
    materials.default.normalScale.set(0.1, 0.1);
  });

  return <primitive object={scene} {...props} />;
};

export const OrbitingSuzi = () => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_state, delta) => {
    if (!groupRef.current || !meshRef.current) return;
    groupRef.current.rotateY(delta * 0.5);
    meshRef.current.rotateY(delta * 5);
  });

  return (
    <group ref={groupRef}>
      <Suzi position={[0, 0, 1]} scale={0.5} objref={meshRef} />
    </group>
  );
};
