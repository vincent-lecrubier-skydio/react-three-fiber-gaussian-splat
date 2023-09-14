import { Environment, OrbitControls, StatsGl } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Box } from './box';
import { Splat } from './splat-object';
import { OrbitingSuzi } from './suzi';
import { useControls } from 'leva';

const urls = [
  'https://antimatter15.com/splat-data/train.splat',
  'https://antimatter15.com/splat-data/plush.splat',
  'https://antimatter15.com/splat-data/truck.splat',
  'https://antimatter15.com/splat-data/garden.splat',
  'https://antimatter15.com/splat-data/treehill.splat',
  'https://antimatter15.com/splat-data/stump.splat',
  'https://antimatter15.com/splat-data/bicycle.splat',
  'https://media.reshot.ai/models/nike_next/model.splat',
];

function App() {
  const { url } = useControls({ url: { label: 'Model URL', options: urls } });
  return (
    <Canvas className="h-full w-full bg-black" gl={{ antialias: false }}>
      <StatsGl />
      <OrbitControls />
      
      <Box position={[-1, 0, 0]} />
      <Box position={[1, 0, 0]} />

      <OrbitingSuzi />

      <group position={[0, 0, 0]}>
        <Splat url={url} />
      </group>
      <Environment preset="city" />
    </Canvas>
  );
}

export default App;
