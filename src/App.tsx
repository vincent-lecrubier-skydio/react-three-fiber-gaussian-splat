// import { OrbitControls } from '@react-three/drei';
// import { Canvas } from '@react-three/fiber';

import { useEffect } from 'react';
import { main } from './splat';

function App() {
  useEffect(() => {
    main().catch((err) => {
      console.log(err);
    });
  }, []);
  return (
    <div>Ok</div>
    // <Canvas className="h-full w-full bg-pink-500">
    //   <OrbitControls />
    //   <ambientLight />
    //   <pointLight position={[10, 10, 10]} />
    //   <Box position={[-1.2, 0, 0]} />
    //   <Box position={[1.2, 0, 0]} />
    // </Canvas>
  );
}

export default App;
