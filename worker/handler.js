// Everything except the wasm import lives here so the Node tests can exercise
// the full request path against a locally instantiated binary.

const MAX_CHARS = 1_000_000;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

const text = (body, status, extra = {}) =>
  new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", ...CORS, ...extra },
  });

// Same ABI as site/main.js: consume an input buffer, read back [len][bytes].
function call(instance, fn, input) {
  const { wasm_alloc, wasm_dealloc, memory } = instance.exports;
  const bytes = new TextEncoder().encode(input);
  const inPtr = wasm_alloc(bytes.length);
  new Uint8Array(memory.buffer).set(bytes, inPtr);
  const outPtr = instance.exports[fn](inPtr, bytes.length);
  const len = new DataView(memory.buffer).getUint32(outPtr, true);
  const result = new TextDecoder().decode(new Uint8Array(memory.buffer, outPtr + 4, len));
  wasm_dealloc(outPtr, 4 + len);
  return result;
}

export function makeFetch(instance) {
  return async (request) => {
    const path = new URL(request.url).pathname;
    const fn = { "/api/defang": "defang", "/api/refang": "refang" }[path];
    if (!fn) {
      return text("Not found. The API is POST /api/defang and POST /api/refang.\n", 404);
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (request.method !== "POST") {
      return text("Send a POST with the text to transform as the raw body.\n", 405, { allow: "POST" });
    }
    const body = await request.text();
    if (body.length > MAX_CHARS) {
      return text(`Body too large; the limit is ${MAX_CHARS} characters.\n`, 413);
    }
    return text(call(instance, fn, body), 200);
  };
}
