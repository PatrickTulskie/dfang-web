const status = document.getElementById("status");
const introDialog = document.getElementById("intro-dialog");

document.getElementById("intro-open").addEventListener("click", () => {
  introDialog.showModal();
});

async function loadWasm() {
  const url = "dfang_wasm.wasm";
  try {
    return (await WebAssembly.instantiateStreaming(fetch(url))).instance;
  } catch {
    const bytes = await (await fetch(url)).arrayBuffer();
    return (await WebAssembly.instantiate(bytes)).instance;
  }
}

// Calls a `(ptr, len) -> packed` export. The input buffer is consumed by the
// call; the result is a [len: u32 LE][bytes] buffer we read and then free.
function call(instance, fn, text) {
  const { wasm_alloc, wasm_dealloc, memory } = instance.exports;
  const bytes = new TextEncoder().encode(text);
  const inPtr = wasm_alloc(bytes.length);
  new Uint8Array(memory.buffer).set(bytes, inPtr);
  const outPtr = instance.exports[fn](inPtr, bytes.length);
  const len = new DataView(memory.buffer).getUint32(outPtr, true);
  const result = new TextDecoder().decode(
    new Uint8Array(memory.buffer, outPtr + 4, len)
  );
  wasm_dealloc(outPtr, 4 + len);
  return result;
}

// Setting `.value` programmatically fires no input event, so the two
// listeners can't trigger each other.
function wire(instance, fn, source, target) {
  source.addEventListener("input", () => {
    target.value = source.value ? call(instance, fn, source.value) : "";
  });
}

for (const button of document.querySelectorAll(".copy")) {
  button.addEventListener("click", async () => {
    const target = document.getElementById(button.dataset.target);
    await navigator.clipboard.writeText(target.value);
    const label = button.textContent;
    button.textContent = "Copied!";
    setTimeout(() => (button.textContent = label), 1200);
  });
}

status.hidden = false;
try {
  const instance = await loadWasm();
  const fanged = document.getElementById("fanged");
  const defanged = document.getElementById("defanged");
  wire(instance, "defang", fanged, defanged);
  wire(instance, "refang", defanged, fanged);
  status.hidden = true;
} catch (err) {
  status.textContent = "Failed to load WebAssembly — this browser may not support it.";
  console.error(err);
}
