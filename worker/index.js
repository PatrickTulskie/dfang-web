// Requests that match a file in dist/ are served as static assets and never
// reach this code; everything else (the API, stray paths) lands here.
// Run ./build.sh first: the wasm import reads from dist/.
import wasmModule from "../dist/dfang_wasm.wasm";
import { makeFetch } from "./handler.js";

export default { fetch: makeFetch(new WebAssembly.Instance(wasmModule)) };
