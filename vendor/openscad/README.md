# @lofcz/openscad-wasm

OpenSCAD compiled to WebAssembly — render `.scad` to STL/3MF/OFF/… in the
browser or Node, no native binary required.

Built from [lofcz/openscad-wasm](https://github.com/lofcz/openscad-wasm),
which tracks [openscad/openscad-wasm](https://github.com/openscad/openscad-wasm)
plus:

- the **freetype no-hinting** patch — stock builds trap the whole WASM module
  (`RuntimeError: null function or function signature mismatch`) on any font
  without a TrueType bytecode program, i.e. most modern fonts;
- mirrored GMP/MPFR downloads with pinned checksums for reliable CI builds;
- runtime extensions: bundled Liberation fonts (`text()`) and the MCAD library.

## Install

```sh
npm install @lofcz/openscad-wasm
```

## Browser usage

```js
import createOpenSCAD from "@lofcz/openscad-wasm";
import { addFonts } from "@lofcz/openscad-wasm/fonts";

const instance = await createOpenSCAD({ noInitialRun: true });
addFonts(instance); // optional: enables text() with bundled Liberation fonts

instance.FS.writeFile("/input.scad", "cube(10);");
const exit = instance.callMain([
  "/input.scad",
  "--backend", "Manifold",
  "--export-format", "binstl",
  "-o", "/out.stl",
]);
if (exit !== 0) throw new Error(`openscad exited with ${exit}`);

const stl = instance.FS.readFile("/out.stl"); // Uint8Array
```

Bundlers: make sure `openscad.wasm` is served as a static asset. The wrapper
resolves it with `new URL("openscad.wasm", import.meta.url)`; Vite and webpack 5
handle that pattern natively.

## Node usage

Node's `fetch` cannot load `file://` URLs, so hand the module the binary
directly:

```js
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import createOpenSCAD from "@lofcz/openscad-wasm";

const require = createRequire(import.meta.url);
const wasmBytes = readFileSync(require.resolve("@lofcz/openscad-wasm/openscad.wasm"));

const instance = await createOpenSCAD({
  noInitialRun: true,
  instantiateWasm(imports, done) {
    WebAssembly.instantiate(wasmBytes, imports).then((r) => done(r.instance));
    return {};
  },
});
```

## API

See [`openscad.d.ts`](./openscad.d.ts). The surface is the emscripten module:
`callMain(args)` runs `openscad <args>`, `FS` is the in-memory filesystem the
`.scad` input, MCAD/fonts and exported files live in.

## Rebuilding

The WASM binary is built from the repo root with Docker only:

```sh
make ENV=release   # or: ./build.sh
make npm           # assemble this package from build/ artifacts
```

## License

GPL-2.0 — see [COPYING](./COPYING). OpenSCAD and its dependencies
(CGAL, FreeType, HarfBuzz, …) are compiled into the binary.
