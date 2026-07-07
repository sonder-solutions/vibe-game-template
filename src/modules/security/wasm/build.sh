#!/bin/bash
# Build WASM module
cd "$(dirname "$0")"
wasm-pack build --target web --out-dir pkg
echo "WASM built successfully"
