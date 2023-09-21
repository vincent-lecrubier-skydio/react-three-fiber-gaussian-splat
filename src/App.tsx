import {
  Environment,
  Gltf,
  OrbitControls,
  PerformanceMonitor,
  StatsGl,
} from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Box } from './box';
import { Splat } from './splat-object';
import { OrbitingSuzi } from './suzi';
import { Leva, useControls } from 'leva';
import { Suspense, useState } from 'react';

// import telco from "./telco.gltf";

// import output from './output.splat';
// import model30k from './model30k.splat';
// import telco7k from './telco7k.splat';
// import telco14k from './telco14k.splat';
// import telco21k from './telco21k.splat';
// import telco30k from './telco30k.splat';
// import telco414k from './telco414k.splat';
// import telco421k from './telco421k.splat';
// import telco428k from './telco428k.splat';
// import telco435k from './telco435k.splat';
// import telco442k from './telco442k.splat';
// import telco449k from './telco449k.splat';
// import telco456k from './telco456k.splat';
// import telco463k from './telco463k.splat';
// import telco4200k from './telco4200k.splat';
// import telco_2_7k from './telco-2-7k.splat';
// import telco_2_14k from './telco-2-14k.splat';
// import telco_2_21k from './telco-2-21k.splat';
// import telco_2_28k from './telco-2-28k.splat';
// import telco_2_42k from './telco-2-42k.splat';

const gltfUrls = [
  // telco
] as const;

const splatUrls = [

  // output,

  // telco_2_42k,
  // telco_2_28k,
  // telco_2_21k,
  // telco_2_14k,
  // telco_2_7k,
  // telco4200k,
  // telco463k,
  // telco456k,
  // telco449k,
  // telco442k,
  // telco435k,
  // telco428k,
  // telco421k,
  // telco414k,
  // telco30k,
  // telco21k,
  // telco14k,
  // telco7k,
  // model30k,

  'https://antimatter15.com/splat-data/train.splat',
  'https://antimatter15.com/splat-data/plush.splat',
  'https://antimatter15.com/splat-data/truck.splat',
  'https://antimatter15.com/splat-data/garden.splat',
  'https://antimatter15.com/splat-data/treehill.splat',
  'https://antimatter15.com/splat-data/stump.splat',
  'https://antimatter15.com/splat-data/bicycle.splat',
  'https://media.reshot.ai/models/nike_next/model.splat',
] as const;

function App() {
  // On screen controls
  const { splatUrl, gltfUrl, throttleDpr, maxDpr, throttleSplats, maxSplats } = useControls({
    splatUrl: { label: 'Splat URL', options: splatUrls },
    gltfUrl: { label: "Gltf URL", options: gltfUrls },
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
  }) as any;

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

  const splatScale = 2.7 as number;
  const splatPos = [12.1 + 0, 19.3, -1.0] as [number, number, number];
  const splatRot = [-0.516, 0.15, 0.1] as [number, number, number];

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
            setSplats(() =>
              Math.min(
                maxSplats,
                Math.round((0.9 + 0.2 * factor) * effectiveSplats)
              )
            );
          }}
          onDecline={({ factor }) => {
            setFactor(factor);
            setSplats(() =>
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

        {gltfUrl && <Suspense fallback={null}>
          <group position={[2, 0, 0]} rotation={[0, 0, 0]}  >
            <Gltf src={gltfUrl} />
          </group>
        </Suspense>}

        {splatUrl && <group position={splatPos} rotation={splatRot} scale={[splatScale, splatScale, splatScale]} >
          <Splat url={splatUrl} maxSplats={effectiveSplats} />
        </group>}
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
