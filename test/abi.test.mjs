// Exercises the built wasm through the same glue logic the browser uses.
// Run `./build.sh` first: this reads the binary out of dist/.
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import assert from "node:assert";

const bytes = await readFile(new URL("../dist/dfang_wasm.wasm", import.meta.url));
const { instance } = await WebAssembly.instantiate(bytes);

function call(fn, text) {
  const { wasm_alloc, wasm_dealloc, memory } = instance.exports;
  const encoded = new TextEncoder().encode(text);
  const inPtr = wasm_alloc(encoded.length);
  new Uint8Array(memory.buffer).set(encoded, inPtr);
  const outPtr = instance.exports[fn](inPtr, encoded.length);
  const len = new DataView(memory.buffer).getUint32(outPtr, true);
  const result = new TextDecoder().decode(new Uint8Array(memory.buffer, outPtr + 4, len));
  wasm_dealloc(outPtr, 4 + len);
  return result;
}

test("defangs the classic IOC shapes", () => {
  assert.equal(call("defang", "http://example.com"), "hxxp[://]example[.]com");
  assert.equal(call("defang", "user@example.com"), "user[@]example[.]com");
  assert.equal(call("defang", "192.168.1.1"), "192[.]168[.]1[.]1");
  assert.equal(call("defang", "2001:db8::1 and http://evil.com"), "2001[:]db8[:][:]1 and hxxp[://]evil[.]com");
});

test("refangs and round-trips", () => {
  assert.equal(call("refang", "hxxps[://]example[.]com"), "https://example.com");
  const original = "https://patricktulskie.com/some/path?q=1";
  assert.equal(call("refang", call("defang", original)), original);
});

test("survives edge-case inputs", () => {
  assert.equal(call("defang", ""), "");
  assert.equal(call("defang", "Ünïcödé.example.com 日本"), "Ünïcödé[.]example[.]com 日本");
  assert.equal(call("defang", "x".repeat(100000)).length, 100000);
});

test("does not corrupt memory across many calls", () => {
  for (let i = 0; i < 5000; i++) {
    assert.equal(call("defang", `http://host${i}.example.com`), `hxxp[://]host${i}[.]example[.]com`);
  }
});
