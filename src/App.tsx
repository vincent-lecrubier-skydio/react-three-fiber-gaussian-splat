import {
  Environment,
  OrbitControls,
  PerformanceMonitor,
  StatsGl,
} from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Box } from './box';
import { Splat } from './splat-object';
import { OrbitingSuzi } from './suzi';
import { Leva, useControls } from 'leva';
import { useState } from 'react';

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
  // On screen controls
  const { url, throttleDpr, maxDpr, throttleSplats, maxSplats } = useControls({
    url: { label: 'Model URL', options: urls },
    throttleDpr: {
      label: 'Degrade pixel ratio based on perf.',
      value: false,
    },
    maxDpr: { label: 'Max pixel ratio', value: window?.devicePixelRatio ?? 1 },
    throttleSplats: {
      label: 'Degrade splat count based on perf.',
      value: false,
    },
    maxSplats: { label: 'Max splat count', value: 10000000 },
  });

  // Performance factor
  const [factor, setFactor] = useState(1);

  // Downsample pixels if perf gets bad
  // const [dpr, setDpr] = useState(maxDpr);
  const dpr = Math.min(maxDpr, Math.round(0.5 + 1.5 * factor));
  const effectiveDpr = throttleDpr ? Math.min(maxDpr, dpr) : maxDpr;

  // Downsample splats if perf gets bad
  const [splats, setSplats] = useState(maxSplats);
  // const splats =
  const effectiveSplats = throttleSplats
    ? Math.min(maxSplats, splats)
    : maxSplats;

  return (
    <>
      <Leva oneLineLabels collapsed />
      <Canvas
        className="h-full w-full bg-black"
        gl={{ antialias: false }}
        dpr={effectiveDpr}
      >
        <PerformanceMonitor
          ms={250}
          iterations={1}
          step={1}
          onIncline={({ factor }) => {
            setFactor(factor);
            setSplats(
              Math.min(
                maxSplats,
                Math.round((0.9 + 0.2 * factor) * effectiveSplats)
              )
            );
          }}
          onDecline={({ factor }) => {
            setFactor(factor);
            setSplats(
              Math.min(
                maxSplats,
                Math.round((0.9 + 0.2 * factor) * effectiveSplats)
              )
            );
          }}
        />

        <StatsGl />

        <OrbitControls />

        <Box position={[-1, 0, 0]} />
        <Box position={[1, 0, 0]} />

        <OrbitingSuzi />

        <group position={[0, 0, 0]}>
          <Splat url={url} maxSplats={effectiveSplats} />
        </group>
        <Environment preset="city" />
      </Canvas>
      <div className="absolute bottom-0 left-0 rounded-lg bg-white shadow border-gray-200 bg-white p-2 m-4">
        {factor < 1.0 && (throttleSplats || throttleDpr) ? (
          <div className="text-red-500">
            Quality degraded to save FPS! You can disable this in settings.
          </div>
        ) : null}
        {factor < 0.5 && !throttleSplats && !throttleDpr ? (
          <div className="text-red-500">
            FPS degraded! You can enable quality tuning in settings.
          </div>
        ) : null}
        <div>Perf factor: {factor.toFixed(2)}</div>
        <div>Applied pixel ratio: {effectiveDpr.toFixed(2)}</div>
        <div>Applied splat count: {(effectiveSplats / 1e6).toFixed(2)}M</div>
      </div>
    </>
  );
}

export default App;
