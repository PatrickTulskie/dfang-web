#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

# Cloudflare's build image has no Rust unless it detects a reason to, so
# bootstrap rustup ourselves when it's missing (CI and local machines skip this).
if ! command -v rustup >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
    | sh -s -- -y --profile minimal --default-toolchain stable --target wasm32-unknown-unknown
  . "$HOME/.cargo/env"
fi

rustup target add wasm32-unknown-unknown
cargo build --release --target wasm32-unknown-unknown --manifest-path wasm/Cargo.toml

rm -rf dist
cp -R site dist
cp wasm/target/wasm32-unknown-unknown/release/dfang_wasm.wasm dist/
