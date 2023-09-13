import { Environment, OrbitControls, StatsGl } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Box } from './box';
import { Splat } from './splat-object';
import { OrbitingSuzi } from './suzi';
import { useControls } from 'leva';

function App() {
  useControls({ name: 'World', aNumber: 0 });
  return (
    <Canvas className="h-full w-full bg-black" gl={{ antialias: false }}>
      <StatsGl />
      <OrbitControls />
      <Box position={[-1, 0, 0]} />
      <Box position={[1, 0, 0]} />

      <OrbitingSuzi />

      <group position={[0, 0, 0]}>
        <Splat />
      </group>
      <Environment preset="city" />
    </Canvas>
  );
}

export default App;
