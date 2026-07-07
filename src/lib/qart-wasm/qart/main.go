// Copyright 2024 QArt WASM API
// Clean API wrapper for QArt algorithm

//go:build wasm

package main

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"strings"
	"syscall/js"

	"qart-wasm"
)

var pic = &Image{
	Dx:      0,
	Dy:      0,
	URL:     "",
	Version: 5,
	Mask:    2,
	Scale:   8,
}

// Generate QR code with current settings
func generate(this js.Value, args []js.Value) interface{} {
	img, err := pic.Encode()
	if err != nil {
		return map[string]interface{}{
			"error": err.Error(),
		}
	}

	return map[string]interface{}{
		"image": "data:image/png;base64," + base64.StdEncoding.EncodeToString(img),
	}
}

// Generate QR code as SVG
func generateSVG(this js.Value, args []js.Value) interface{} {
	_, err := pic.Encode()
	if err != nil {
		return map[string]interface{}{
			"error": err.Error(),
		}
	}

	// Generate SVG from QR code
	svg := generateSVGFromCode(pic.Code, 10) // 10px per module

	return map[string]interface{}{
		"svg": svg,
	}
}

// Helper to generate SVG from QR code
func generateSVGFromCode(code *qr.Code, moduleSize int) string {
	size := code.Size
	margin := 4 * moduleSize
	totalSize := size*moduleSize + margin*2

	var svg strings.Builder
	svg.WriteString(fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d">
<rect width="%d" height="%d" fill="white"/>
`, totalSize, totalSize, totalSize, totalSize, totalSize, totalSize))

	// Draw black modules
	for y := 0; y < size; y++ {
		for x := 0; x < size; x++ {
			if code.Black(x, y) {
				px := x*moduleSize + margin
				py := y*moduleSize + margin
				svg.WriteString(fmt.Sprintf(`<rect x="%d" y="%d" width="%d" height="%d" fill="black"/>
`, px, py, moduleSize, moduleSize))
			}
		}
	}

	svg.WriteString(`</svg>`)
	return svg.String()
}

// Set the image from base64 data
func setImage(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 {
		return map[string]interface{}{"error": "image data required"}
	}

	dataURL := args[0].String()

	// Handle empty or null image
	if dataURL == "" || dataURL == "null" || dataURL == "undefined" {
		pic.File = nil
		pic.Target = nil
		return map[string]interface{}{"success": true}
	}

	_, enc, ok := cutString(dataURL, ";base64,")
	if !ok {
		enc = dataURL
	}

	data, err := base64.StdEncoding.DecodeString(enc)
	if err != nil {
		return map[string]interface{}{"error": err.Error()}
	}

	_, _, err = image.Decode(bytes.NewReader(data))
	if err != nil {
		return map[string]interface{}{"error": err.Error()}
	}

	pic.SetFile(data)
	return map[string]interface{}{"success": true}
}

// Set image position
func setPosition(this js.Value, args []js.Value) interface{} {
	if len(args) < 2 {
		return map[string]interface{}{"error": "x and y required"}
	}
	pic.Dx = args[0].Int()
	pic.Dy = args[1].Int()
	return map[string]interface{}{"success": true}
}

// Set image size
func setImageSize(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 {
		return map[string]interface{}{"error": "size required"}
	}
	pic.Size = args[0].Int()
	return map[string]interface{}{"success": true}
}

// Set QR version
func setVersion(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 {
		return map[string]interface{}{"error": "version required"}
	}
	version := args[0].Int()
	if version < 1 || version > 40 {
		return map[string]interface{}{"error": "version must be 1-40"}
	}
	pic.Version = version
	return map[string]interface{}{"success": true}
}

// Set QR mask
func setMask(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 {
		return map[string]interface{}{"error": "mask required"}
	}
	pic.Mask = args[0].Int()
	return map[string]interface{}{"success": true}
}

// Set QR URL/data
func setURL(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 {
		return map[string]interface{}{"error": "url required"}
	}
	pic.URL = args[0].String()
	return map[string]interface{}{"success": true}
}

// Reset all settings
func reset(this js.Value, args []js.Value) interface{} {
	pic.Dx = 0
	pic.Dy = 0
	pic.Size = 0
	pic.Version = 5
	pic.Mask = 2
	pic.Rotation = 0
	pic.Rand = false
	pic.Dither = false
	pic.OnlyDataBits = false
	return map[string]interface{}{"success": true}
}

// Set random pixel selection
func setRand(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 {
		return map[string]interface{}{"error": "rand value required"}
	}
	pic.Rand = args[0].Bool()
	return map[string]interface{}{"success": true}
}

// Set dithering
func setDither(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 {
		return map[string]interface{}{"error": "dither value required"}
	}
	pic.Dither = args[0].Bool()
	return map[string]interface{}{"success": true}
}

// Set only data bits
func setOnlyDataBits(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 {
		return map[string]interface{}{"error": "onlyDataBits value required"}
	}
	pic.OnlyDataBits = args[0].Bool()
	return map[string]interface{}{"success": true}
}

// Helper function
func cutString(s, sep string) (before, after string, found bool) {
	if i := indexString(s, sep); i >= 0 {
		return s[:i], s[i+len(sep):], true
	}
	return s, "", false
}

func indexString(s, sep string) int {
	for i := 0; i <= len(s)-len(sep); i++ {
		if s[i:i+len(sep)] == sep {
			return i
		}
	}
	return -1
}

func main() {
	// Export functions to JavaScript
	js.Global().Set("qartGenerate", js.FuncOf(generate))
	js.Global().Set("qartGenerateSVG", js.FuncOf(generateSVG))
	js.Global().Set("qartSetImage", js.FuncOf(setImage))
	js.Global().Set("qartSetPosition", js.FuncOf(setPosition))
	js.Global().Set("qartSetImageSize", js.FuncOf(setImageSize))
	js.Global().Set("qartSetVersion", js.FuncOf(setVersion))
	js.Global().Set("qartSetMask", js.FuncOf(setMask))
	js.Global().Set("qartSetURL", js.FuncOf(setURL))
	js.Global().Set("qartSetRand", js.FuncOf(setRand))
	js.Global().Set("qartSetDither", js.FuncOf(setDither))
	js.Global().Set("qartSetOnlyDataBits", js.FuncOf(setOnlyDataBits))
	js.Global().Set("qartReset", js.FuncOf(reset))

	// Keep the WASM module running
	select {}
}
