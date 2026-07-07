#!/bin/bash
# Build WASM module
cd src/security/wasm
wasm-pack build --target web --out-dir pkg
echo "WASM built successfully"
