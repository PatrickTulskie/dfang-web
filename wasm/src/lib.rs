//! Thin C-ABI shim over dfang/rfang for the browser.
//!
//! No wasm-bindgen: the JS side allocates an input buffer, writes UTF-8 into
//! it, and gets back a pointer to a `[len: u32 LE][bytes]` buffer it must
//! free with `wasm_dealloc(ptr, 4 + len)`. The input buffer is consumed by
//! the call, so JS only ever frees the output.

fn pack(s: String) -> *mut u8 {
    let bytes = s.into_bytes();
    let mut out = Vec::with_capacity(4 + bytes.len());
    out.extend_from_slice(&(bytes.len() as u32).to_le_bytes());
    out.extend_from_slice(&bytes);
    let mut boxed = out.into_boxed_slice();
    let ptr = boxed.as_mut_ptr();
    std::mem::forget(boxed);
    return ptr;
}

#[no_mangle]
pub extern "C" fn wasm_alloc(len: usize) -> *mut u8 {
    let mut boxed = vec![0u8; len].into_boxed_slice();
    let ptr = boxed.as_mut_ptr();
    std::mem::forget(boxed);
    return ptr;
}

#[no_mangle]
pub extern "C" fn wasm_dealloc(ptr: *mut u8, len: usize) {
    unsafe { drop(Box::from_raw(std::slice::from_raw_parts_mut(ptr, len))) };
}

#[no_mangle]
pub extern "C" fn defang(ptr: *mut u8, len: usize) -> *mut u8 {
    let input = unsafe { Box::from_raw(std::slice::from_raw_parts_mut(ptr, len)) };
    return pack(dfang::defang(&String::from_utf8_lossy(&input)));
}

#[no_mangle]
pub extern "C" fn refang(ptr: *mut u8, len: usize) -> *mut u8 {
    let input = unsafe { Box::from_raw(std::slice::from_raw_parts_mut(ptr, len)) };
    return pack(rfang::refang(&String::from_utf8_lossy(&input)));
}
