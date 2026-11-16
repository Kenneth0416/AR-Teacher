# Vendored MindAR 1.2.5 (image tracking only)

Source: `mind-ar@1.2.5` npm package, `dist/` folder (https://github.com/hiukim/mind-ar-js), MIT licence (see `LICENSE`).

Why vendored: `npm i mind-ar` builds the native `canvas` package (used only by its Node-side
compiler), which fails on many machines. The browser builds below are self-contained ES modules
(TensorFlow.js is bundled inside the controller chunk), so we copy them instead of depending on the
package.

Files:
- `mindar-image-three.prod.js` - `MindARThree` (imports `three` and `three/addons/...` from our own three).
- `mindar-image.prod.js`       - `Controller`, `Compiler`, `UI` (used by the target compiler).
- `controller-mGt1s8dJ.js`, `ui-fBadYuor.js` - shared chunks imported by the two files above.

## Local patches

### 1. three r162+ colour management (`mindar-image-three.prod.js`)

MindAR 1.2.5 was built against three r150 and uses the API removed in three r162:

```diff
- import { ..., sRGBEncoding as Si, ... } from "three";
- this.renderer.outputEncoding = Si
+ import { ..., SRGBColorSpace as Si, ... } from "three";
+ this.renderer.outputColorSpace = Si
```

This lets the project use current three (pinned in package.json). Re-apply if you ever re-vendor:

```sh
sed -i 's/sRGBEncoding as Si/SRGBColorSpace as Si/; s/this\.renderer\.outputEncoding = Si/this.renderer.outputColorSpace = Si/' mindar-image-three.prod.js
```

### 2. Node-only `require()` calls (`controller-mGt1s8dJ.js`)

The bundled TensorFlow.js contains three Node-platform code paths (`require("node-fetch")`,
`require("string_decoder")`, `require("util")`) that never run in a browser, but Vite 8 / Rolldown
tries to resolve them at build time and fails. They are rewritten to `globalThis.require(...)` so the
bundler ignores them (behaviour in the browser is unchanged: those branches are unreachable).

```sh
sed -i 's/require("node-fetch")/globalThis.require("node-fetch")/; s/require("string_decoder")/globalThis.require("string_decoder")/; s/this\.util = require("util")/this.util = globalThis.require("util")/' controller-mGt1s8dJ.js
```

### 3. Track on the 256 px keyframe instead of the 128 px one (`controller-mGt1s8dJ.js`)

MindAR compiles two tracking keyframes per target (short side 256 px and 128 px) and by default
tracks on the 128 px one (`Y5 = 1`). For text-heavy textbook pages the 128 px keyframe keeps only
2-11 trackable features (vs 17-40 at 256 px), so a page is *detected* but tracking fails on every
frame and the anchor never appears (verified with a fake camera: 0 tracked points). We switch the
tracker to keyframe 0 (256 px). No recompilation of `.mind` files is needed.

```diff
- }, Z5 = 6, B5 = 1, H5 = 10, _5 = 1, U5 = 0.8, Y5 = 1, Un = 1e3;
+ }, Z5 = 6, B5 = 1, H5 = 10, _5 = 1, U5 = 0.8, Y5 = 0, Un = 1e3;
```

```sh
sed -i 's/U5 = 0.8, Y5 = 1, Un = 1e3/U5 = 0.8, Y5 = 0, Un = 1e3/' controller-mGt1s8dJ.js
```
