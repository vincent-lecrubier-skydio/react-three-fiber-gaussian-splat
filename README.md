# Gaussian splatting in ThreeJS with React Three Fiber

## Get started

Install the JS dependencies

```bash
npm install
```

Create a `.splat` dataset from a standard Gaussian splatting `.ply` file.

The following scripts are 2 alternatives to create the `src/output.splat` file from the Gaussian splatting `input.ply` file.
Feel free to rename files after/before running it, I couldn't be bothered to add CLI arguments.

```bash
# Either in NodeJS
node ./convert_ply_to_splat.js

# Or in Python
python ./convert_ply_to_splat.py
```

Manually add your `.splat` file to the `splatUrls` list in `src/App.tsx`.

Then run the app:

```bash
npm run dev
```

## Acknowledgements

Inspired by:

- Gaussian splatting original paper: https://github.com/graphdeco-inria/gaussian-splatting
- Gaussian splatting webgl implementation https://github.com/antimatter15/splat

Using:

- https://github.com/pmndrs/react-three-fiber
- https://github.com/pmndrs/drei
- https://github.com/pmndrs/leva

Thanks to [Kevin Kwok](https://github.com/antimatter15) for the [original](https://github.com/antimatter15/splat) pure webgl implementation.

Thanks to Otavio Good for discussions on different approaches for [order independent transparency](https://en.wikipedia.org/wiki/Order-independent_transparency), Mikola Lysenko for [regl](http://regl.party/) and also for helpful advice about webgl and webgpu, Ethan Weber for discussions about how NeRFs work and letting me know that sorting is hard, Gray Crawford for identifying issues with color rendering and camera controls, Anna Brewer for help with implementing animations, and GPT-4 for writing all the WebGL boilerplate.
