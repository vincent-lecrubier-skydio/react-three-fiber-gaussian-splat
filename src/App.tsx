// import { useEffect } from 'react';
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Box } from './box';
import { Splat } from './splat-object';

// import { main } from './splat';

function App() {
  // useEffect(() => {
  //   main().catch((err) => {
  //     console.log(err);
  //   });
  // }, []);
  return (
    // <div>Ok</div>
    <Canvas className="h-full w-full bg-black">
      <OrbitControls />
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Box position={[-1, 0, 0]} />
      <Box position={[1, 0, 0]} />
      <Splat />
    </Canvas>
  );
}

export default App;
