import { useGLTF } from '@react-three/drei';

export const Suzi = (props) => {
  const { nodes } = useGLTF(
    'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/suzanne-high-poly/model.gltf'
  );
  return (
    <mesh castShadow receiveShadow geometry={nodes.Suzanne.geometry} {...props}>
      <meshStandardMaterial color="#ff00ff" roughness={0} />
    </mesh>
  );
};
