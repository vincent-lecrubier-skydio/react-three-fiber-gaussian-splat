import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';

export function Box(props: any) {
  const meshRef = useRef<Mesh>();

  const [hovered, setHover] = useState(false);
  const [active, setActive] = useState(false);

  useFrame((_state, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x += delta;
  });

  return (
    <mesh
      {...props}
      ref={meshRef}
      scale={active ? 1 : 0.5}
      onClick={(_event) => setActive(!active)}
      onPointerOver={(_event) => setHover(true)}
      onPointerOut={(_event) => setHover(false)}
      renderOrder={5}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={hovered ? '#0000ff' : '#00ffff'}
        transparent={false}
        roughness={0}
        metalness={0.5}
      />
    </mesh>
  );
}
