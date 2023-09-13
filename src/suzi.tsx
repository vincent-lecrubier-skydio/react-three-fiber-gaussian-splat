import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { FlakesTexture } from 'three-stdlib';

export const Suzi = ({ objref: ref, ...props }) => {
  const { scene, materials } = useGLTF(
    'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/suzanne-high-poly/model.gltf'
  );
  useLayoutEffect(() => {
    scene.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.receiveShadow = true;
      obj.castShadow = true;
      ref.current = obj;
    });
    materials.default.color.set('orange');
    materials.default.roughness = 0;
    materials.default.normalMap = new THREE.CanvasTexture(
      new FlakesTexture(),
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
  const groupRef = useRef(null);
  const meshRef = useRef(null);

  useFrame((state, delta) => {
    groupRef.current.rotateY(delta * 0.5);
    meshRef.current.rotateY(delta * 5);
  });

  return (
    <group ref={groupRef}>
      <Suzi position={[0, 0, 1]} scale={0.5} objref={meshRef} />
    </group>
  );
};
