// Drives the worker's request handler end to end — real wasm, real
// Request/Response objects — without needing wrangler.
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import assert from "node:assert";
import { makeFetch } from "../worker/handler.js";

const bytes = await readFile(new URL("../dist/dfang_wasm.wasm", import.meta.url));
const { instance } = await WebAssembly.instantiate(bytes);
const fetch = makeFetch(instance);

const post = (path, body) =>
  fetch(new Request(`https://dfang.sh${path}`, { method: "POST", body }));

test("defangs a POST body", async () => {
  const res = await post("/api/defang", "http://evil.example.com and user@evil.com");
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "hxxp[://]evil[.]example[.]com and user[@]evil[.]com");
});

test("refangs a POST body", async () => {
  const res = await post("/api/refang", "hxxps[://]example[.]com");
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "https://example.com");
});

test("preserves multi-line bodies", async () => {
  const res = await post("/api/defang", "http://a.com\nhttp://b.com\n");
  assert.equal(await res.text(), "hxxp[://]a[.]com\nhxxp[://]b[.]com\n");
});

test("rejects non-POST methods", async () => {
  const res = await fetch(new Request("https://dfang.sh/api/defang"));
  assert.equal(res.status, 405);
  assert.equal(res.headers.get("allow"), "POST");
});

test("404s unknown paths", async () => {
  const res = await post("/api/nope", "x");
  assert.equal(res.status, 404);
});

test("answers CORS preflight", async () => {
  const res = await fetch(new Request("https://dfang.sh/api/defang", { method: "OPTIONS" }));
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("access-control-allow-origin"), "*");
});

test("caps oversized bodies", async () => {
  const res = await post("/api/defang", "x".repeat(1_000_001));
  assert.equal(res.status, 413);
});
