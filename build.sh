#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

rustup target add wasm32-unknown-unknown
cargo build --release --target wasm32-unknown-unknown --manifest-path wasm/Cargo.toml

rm -rf dist
cp -R site dist
cp wasm/target/wasm32-unknown-unknown/release/dfang_wasm.wasm dist/
