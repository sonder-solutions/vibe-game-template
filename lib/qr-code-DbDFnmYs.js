var xt=Object.defineProperty;var Vt=(i,t,e)=>t in i?xt(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e;var p=(i,t,e)=>Vt(i,typeof t!="symbol"?t+"":t,e);import"./modulepreload-polyfill-B5Qt9EMX.js";const Ot="/assets/qart-wlca0A4T.wasm",Nt=`// Copyright 2018 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

"use strict";

(() => {
	const enosys = () => {
		const err = new Error("not implemented");
		err.code = "ENOSYS";
		return err;
	};

	if (!globalThis.fs) {
		let outputBuf = "";
		globalThis.fs = {
			constants: { O_WRONLY: -1, O_RDWR: -1, O_CREAT: -1, O_TRUNC: -1, O_APPEND: -1, O_EXCL: -1 }, // unused
			writeSync(fd, buf) {
				outputBuf += decoder.decode(buf);
				const nl = outputBuf.lastIndexOf("\\n");
				if (nl != -1) {
					console.log(outputBuf.substring(0, nl));
					outputBuf = outputBuf.substring(nl + 1);
				}
				return buf.length;
			},
			write(fd, buf, offset, length, position, callback) {
				if (offset !== 0 || length !== buf.length || position !== null) {
					callback(enosys());
					return;
				}
				const n = this.writeSync(fd, buf);
				callback(null, n);
			},
			chmod(path, mode, callback) { callback(enosys()); },
			chown(path, uid, gid, callback) { callback(enosys()); },
			close(fd, callback) { callback(enosys()); },
			fchmod(fd, mode, callback) { callback(enosys()); },
			fchown(fd, uid, gid, callback) { callback(enosys()); },
			fstat(fd, callback) { callback(enosys()); },
			fsync(fd, callback) { callback(null); },
			ftruncate(fd, length, callback) { callback(enosys()); },
			lchown(path, uid, gid, callback) { callback(enosys()); },
			link(path, link, callback) { callback(enosys()); },
			lstat(path, callback) { callback(enosys()); },
			mkdir(path, perm, callback) { callback(enosys()); },
			open(path, flags, mode, callback) { callback(enosys()); },
			read(fd, buffer, offset, length, position, callback) { callback(enosys()); },
			readdir(path, callback) { callback(enosys()); },
			readlink(path, callback) { callback(enosys()); },
			rename(from, to, callback) { callback(enosys()); },
			rmdir(path, callback) { callback(enosys()); },
			stat(path, callback) { callback(enosys()); },
			symlink(path, link, callback) { callback(enosys()); },
			truncate(path, length, callback) { callback(enosys()); },
			unlink(path, callback) { callback(enosys()); },
			utimes(path, atime, mtime, callback) { callback(enosys()); },
		};
	}

	if (!globalThis.process) {
		globalThis.process = {
			getuid() { return -1; },
			getgid() { return -1; },
			geteuid() { return -1; },
			getegid() { return -1; },
			getgroups() { throw enosys(); },
			pid: -1,
			ppid: -1,
			umask() { throw enosys(); },
			cwd() { throw enosys(); },
			chdir() { throw enosys(); },
		}
	}

	if (!globalThis.crypto) {
		throw new Error("globalThis.crypto is not available, polyfill required (crypto.getRandomValues only)");
	}

	if (!globalThis.performance) {
		throw new Error("globalThis.performance is not available, polyfill required (performance.now only)");
	}

	if (!globalThis.TextEncoder) {
		throw new Error("globalThis.TextEncoder is not available, polyfill required");
	}

	if (!globalThis.TextDecoder) {
		throw new Error("globalThis.TextDecoder is not available, polyfill required");
	}

	const encoder = new TextEncoder("utf-8");
	const decoder = new TextDecoder("utf-8");

	globalThis.Go = class {
		constructor() {
			this.argv = ["js"];
			this.env = {};
			this.exit = (code) => {
				if (code !== 0) {
					console.warn("exit code:", code);
				}
			};
			this._exitPromise = new Promise((resolve) => {
				this._resolveExitPromise = resolve;
			});
			this._pendingEvent = null;
			this._scheduledTimeouts = new Map();
			this._nextCallbackTimeoutID = 1;

			const setInt64 = (addr, v) => {
				this.mem.setUint32(addr + 0, v, true);
				this.mem.setUint32(addr + 4, Math.floor(v / 4294967296), true);
			}

			const setInt32 = (addr, v) => {
				this.mem.setUint32(addr + 0, v, true);
			}

			const getInt64 = (addr) => {
				const low = this.mem.getUint32(addr + 0, true);
				const high = this.mem.getInt32(addr + 4, true);
				return low + high * 4294967296;
			}

			const loadValue = (addr) => {
				const f = this.mem.getFloat64(addr, true);
				if (f === 0) {
					return undefined;
				}
				if (!isNaN(f)) {
					return f;
				}

				const id = this.mem.getUint32(addr, true);
				return this._values[id];
			}

			const storeValue = (addr, v) => {
				const nanHead = 0x7FF80000;

				if (typeof v === "number" && v !== 0) {
					if (isNaN(v)) {
						this.mem.setUint32(addr + 4, nanHead, true);
						this.mem.setUint32(addr, 0, true);
						return;
					}
					this.mem.setFloat64(addr, v, true);
					return;
				}

				if (v === undefined) {
					this.mem.setFloat64(addr, 0, true);
					return;
				}

				let id = this._ids.get(v);
				if (id === undefined) {
					id = this._idPool.pop();
					if (id === undefined) {
						id = this._values.length;
					}
					this._values[id] = v;
					this._goRefCounts[id] = 0;
					this._ids.set(v, id);
				}
				this._goRefCounts[id]++;
				let typeFlag = 0;
				switch (typeof v) {
					case "object":
						if (v !== null) {
							typeFlag = 1;
						}
						break;
					case "string":
						typeFlag = 2;
						break;
					case "symbol":
						typeFlag = 3;
						break;
					case "function":
						typeFlag = 4;
						break;
				}
				this.mem.setUint32(addr + 4, nanHead | typeFlag, true);
				this.mem.setUint32(addr, id, true);
			}

			const loadSlice = (addr) => {
				const array = getInt64(addr + 0);
				const len = getInt64(addr + 8);
				return new Uint8Array(this._inst.exports.mem.buffer, array, len);
			}

			const loadSliceOfValues = (addr) => {
				const array = getInt64(addr + 0);
				const len = getInt64(addr + 8);
				const a = new Array(len);
				for (let i = 0; i < len; i++) {
					a[i] = loadValue(array + i * 8);
				}
				return a;
			}

			const loadString = (addr) => {
				const saddr = getInt64(addr + 0);
				const len = getInt64(addr + 8);
				return decoder.decode(new DataView(this._inst.exports.mem.buffer, saddr, len));
			}

			const timeOrigin = Date.now() - performance.now();
			this.importObject = {
				_gotest: {
					add: (a, b) => a + b,
				},
				gojs: {
					// Go's SP does not change as long as no Go code is running. Some operations (e.g. calls, getters and setters)
					// may synchronously trigger a Go event handler. This makes Go code get executed in the middle of the imported
					// function. A goroutine can switch to a new stack if the current stack is too small (see morestack function).
					// This changes the SP, thus we have to update the SP used by the imported function.

					// func wasmExit(code int32)
					"runtime.wasmExit": (sp) => {
						sp >>>= 0;
						const code = this.mem.getInt32(sp + 8, true);
						this.exited = true;
						delete this._inst;
						delete this._values;
						delete this._goRefCounts;
						delete this._ids;
						delete this._idPool;
						this.exit(code);
					},

					// func wasmWrite(fd uintptr, p unsafe.Pointer, n int32)
					"runtime.wasmWrite": (sp) => {
						sp >>>= 0;
						const fd = getInt64(sp + 8);
						const p = getInt64(sp + 16);
						const n = this.mem.getInt32(sp + 24, true);
						fs.writeSync(fd, new Uint8Array(this._inst.exports.mem.buffer, p, n));
					},

					// func resetMemoryDataView()
					"runtime.resetMemoryDataView": (sp) => {
						sp >>>= 0;
						this.mem = new DataView(this._inst.exports.mem.buffer);
					},

					// func nanotime1() int64
					"runtime.nanotime1": (sp) => {
						sp >>>= 0;
						setInt64(sp + 8, (timeOrigin + performance.now()) * 1000000);
					},

					// func walltime() (sec int64, nsec int32)
					"runtime.walltime": (sp) => {
						sp >>>= 0;
						const msec = (new Date).getTime();
						setInt64(sp + 8, msec / 1000);
						this.mem.setInt32(sp + 16, (msec % 1000) * 1000000, true);
					},

					// func scheduleTimeoutEvent(delay int64) int32
					"runtime.scheduleTimeoutEvent": (sp) => {
						sp >>>= 0;
						const id = this._nextCallbackTimeoutID;
						this._nextCallbackTimeoutID++;
						this._scheduledTimeouts.set(id, setTimeout(
							() => {
								this._resume();
								while (this._scheduledTimeouts.has(id)) {
									// for some reason Go failed to register the timeout event, log and try again
									// (temporary workaround for https://github.com/golang/go/issues/28975)
									console.warn("scheduleTimeoutEvent: missed timeout event");
									this._resume();
								}
							},
							getInt64(sp + 8),
						));
						this.mem.setInt32(sp + 16, id, true);
					},

					// func clearTimeoutEvent(id int32)
					"runtime.clearTimeoutEvent": (sp) => {
						sp >>>= 0;
						const id = this.mem.getInt32(sp + 8, true);
						clearTimeout(this._scheduledTimeouts.get(id));
						this._scheduledTimeouts.delete(id);
					},

					// func getRandomData(r []byte)
					"runtime.getRandomData": (sp) => {
						sp >>>= 0;
						crypto.getRandomValues(loadSlice(sp + 8));
					},

					// func finalizeRef(v ref)
					"syscall/js.finalizeRef": (sp) => {
						sp >>>= 0;
						const id = this.mem.getUint32(sp + 8, true);
						this._goRefCounts[id]--;
						if (this._goRefCounts[id] === 0) {
							const v = this._values[id];
							this._values[id] = null;
							this._ids.delete(v);
							this._idPool.push(id);
						}
					},

					// func stringVal(value string) ref
					"syscall/js.stringVal": (sp) => {
						sp >>>= 0;
						storeValue(sp + 24, loadString(sp + 8));
					},

					// func valueGet(v ref, p string) ref
					"syscall/js.valueGet": (sp) => {
						sp >>>= 0;
						const result = Reflect.get(loadValue(sp + 8), loadString(sp + 16));
						sp = this._inst.exports.getsp() >>> 0; // see comment above
						storeValue(sp + 32, result);
					},

					// func valueSet(v ref, p string, x ref)
					"syscall/js.valueSet": (sp) => {
						sp >>>= 0;
						Reflect.set(loadValue(sp + 8), loadString(sp + 16), loadValue(sp + 32));
					},

					// func valueDelete(v ref, p string)
					"syscall/js.valueDelete": (sp) => {
						sp >>>= 0;
						Reflect.deleteProperty(loadValue(sp + 8), loadString(sp + 16));
					},

					// func valueIndex(v ref, i int) ref
					"syscall/js.valueIndex": (sp) => {
						sp >>>= 0;
						storeValue(sp + 24, Reflect.get(loadValue(sp + 8), getInt64(sp + 16)));
					},

					// valueSetIndex(v ref, i int, x ref)
					"syscall/js.valueSetIndex": (sp) => {
						sp >>>= 0;
						Reflect.set(loadValue(sp + 8), getInt64(sp + 16), loadValue(sp + 24));
					},

					// func valueCall(v ref, m string, args []ref) (ref, bool)
					"syscall/js.valueCall": (sp) => {
						sp >>>= 0;
						try {
							const v = loadValue(sp + 8);
							const m = Reflect.get(v, loadString(sp + 16));
							const args = loadSliceOfValues(sp + 32);
							const result = Reflect.apply(m, v, args);
							sp = this._inst.exports.getsp() >>> 0; // see comment above
							storeValue(sp + 56, result);
							this.mem.setUint8(sp + 64, 1);
						} catch (err) {
							sp = this._inst.exports.getsp() >>> 0; // see comment above
							storeValue(sp + 56, err);
							this.mem.setUint8(sp + 64, 0);
						}
					},

					// func valueInvoke(v ref, args []ref) (ref, bool)
					"syscall/js.valueInvoke": (sp) => {
						sp >>>= 0;
						try {
							const v = loadValue(sp + 8);
							const args = loadSliceOfValues(sp + 16);
							const result = Reflect.apply(v, undefined, args);
							sp = this._inst.exports.getsp() >>> 0; // see comment above
							storeValue(sp + 40, result);
							this.mem.setUint8(sp + 48, 1);
						} catch (err) {
							sp = this._inst.exports.getsp() >>> 0; // see comment above
							storeValue(sp + 40, err);
							this.mem.setUint8(sp + 48, 0);
						}
					},

					// func valueNew(v ref, args []ref) (ref, bool)
					"syscall/js.valueNew": (sp) => {
						sp >>>= 0;
						try {
							const v = loadValue(sp + 8);
							const args = loadSliceOfValues(sp + 16);
							const result = Reflect.construct(v, args);
							sp = this._inst.exports.getsp() >>> 0; // see comment above
							storeValue(sp + 40, result);
							this.mem.setUint8(sp + 48, 1);
						} catch (err) {
							sp = this._inst.exports.getsp() >>> 0; // see comment above
							storeValue(sp + 40, err);
							this.mem.setUint8(sp + 48, 0);
						}
					},

					// func valueLength(v ref) int
					"syscall/js.valueLength": (sp) => {
						sp >>>= 0;
						setInt64(sp + 16, parseInt(loadValue(sp + 8).length));
					},

					// valuePrepareString(v ref) (ref, int)
					"syscall/js.valuePrepareString": (sp) => {
						sp >>>= 0;
						const str = encoder.encode(String(loadValue(sp + 8)));
						storeValue(sp + 16, str);
						setInt64(sp + 24, str.length);
					},

					// valueLoadString(v ref, b []byte)
					"syscall/js.valueLoadString": (sp) => {
						sp >>>= 0;
						const str = loadValue(sp + 8);
						loadSlice(sp + 16).set(str);
					},

					// func valueInstanceOf(v ref, t ref) bool
					"syscall/js.valueInstanceOf": (sp) => {
						sp >>>= 0;
						this.mem.setUint8(sp + 24, (loadValue(sp + 8) instanceof loadValue(sp + 16)) ? 1 : 0);
					},

					// func copyBytesToGo(dst []byte, src ref) (int, bool)
					"syscall/js.copyBytesToGo": (sp) => {
						sp >>>= 0;
						const dst = loadSlice(sp + 8);
						const src = loadValue(sp + 32);
						if (!(src instanceof Uint8Array || src instanceof Uint8ClampedArray)) {
							this.mem.setUint8(sp + 48, 0);
							return;
						}
						const toCopy = src.subarray(0, dst.length);
						dst.set(toCopy);
						setInt64(sp + 40, toCopy.length);
						this.mem.setUint8(sp + 48, 1);
					},

					// func copyBytesToJS(dst ref, src []byte) (int, bool)
					"syscall/js.copyBytesToJS": (sp) => {
						sp >>>= 0;
						const dst = loadValue(sp + 8);
						const src = loadSlice(sp + 16);
						if (!(dst instanceof Uint8Array || dst instanceof Uint8ClampedArray)) {
							this.mem.setUint8(sp + 48, 0);
							return;
						}
						const toCopy = src.subarray(0, dst.length);
						dst.set(toCopy);
						setInt64(sp + 40, toCopy.length);
						this.mem.setUint8(sp + 48, 1);
					},

					"debug": (value) => {
						console.log(value);
					},
				}
			};
		}

		async run(instance) {
			if (!(instance instanceof WebAssembly.Instance)) {
				throw new Error("Go.run: WebAssembly.Instance expected");
			}
			this._inst = instance;
			this.mem = new DataView(this._inst.exports.mem.buffer);
			this._values = [ // JS values that Go currently has references to, indexed by reference id
				NaN,
				0,
				null,
				true,
				false,
				globalThis,
				this,
			];
			this._goRefCounts = new Array(this._values.length).fill(Infinity); // number of references that Go has to a JS value, indexed by reference id
			this._ids = new Map([ // mapping from JS values to reference ids
				[0, 1],
				[null, 2],
				[true, 3],
				[false, 4],
				[globalThis, 5],
				[this, 6],
			]);
			this._idPool = [];   // unused ids that have been garbage collected
			this.exited = false; // whether the Go program has exited

			// Pass command line arguments and environment variables to WebAssembly by writing them to the linear memory.
			let offset = 4096;

			const strPtr = (str) => {
				const ptr = offset;
				const bytes = encoder.encode(str + "\\0");
				new Uint8Array(this.mem.buffer, offset, bytes.length).set(bytes);
				offset += bytes.length;
				if (offset % 8 !== 0) {
					offset += 8 - (offset % 8);
				}
				return ptr;
			};

			const argc = this.argv.length;

			const argvPtrs = [];
			this.argv.forEach((arg) => {
				argvPtrs.push(strPtr(arg));
			});
			argvPtrs.push(0);

			const keys = Object.keys(this.env).sort();
			keys.forEach((key) => {
				argvPtrs.push(strPtr(\`\${key}=\${this.env[key]}\`));
			});
			argvPtrs.push(0);

			const argv = offset;
			argvPtrs.forEach((ptr) => {
				this.mem.setUint32(offset, ptr, true);
				this.mem.setUint32(offset + 4, 0, true);
				offset += 8;
			});

			// The linker guarantees global data starts from at least wasmMinDataAddr.
			// Keep in sync with cmd/link/internal/ld/data.go:wasmMinDataAddr.
			const wasmMinDataAddr = 4096 + 8192;
			if (offset >= wasmMinDataAddr) {
				throw new Error("total length of command line and environment variables exceeds limit");
			}

			this._inst.exports.run(argc, argv);
			if (this.exited) {
				this._resolveExitPromise();
			}
			await this._exitPromise;
		}

		_resume() {
			if (this.exited) {
				throw new Error("Go program has already exited");
			}
			this._inst.exports.resume();
			if (this.exited) {
				this._resolveExitPromise();
			}
		}

		_makeFuncWrapper(id) {
			const go = this;
			return function () {
				const event = { id: id, this: this, args: arguments };
				go._pendingEvent = event;
				go._resume();
				return event.result;
			};
		}
	}
})();
`,T=class T{constructor(){p(this,"wasmModule",null);p(this,"go",null)}static async getInstance(){return T.instance||(T.instance=new T,await T.instance.initialize()),T.instance}async initialize(){const t=document.createElement("script");t.textContent=Nt,document.head.appendChild(t),await new Promise(n=>setTimeout(n,100)),this.go=new Go;const e=await WebAssembly.instantiateStreaming(fetch(Ot),this.go.importObject);this.wasmModule=e.instance,this.go.run(this.wasmModule),await new Promise(n=>setTimeout(n,200))}async generate(){const t=window.qartGenerate();if(t.error)throw new Error(t.error);return t.image}async generateSVG(){const t=window.qartGenerateSVG();if(t.error)throw new Error(t.error);return t.svg}async setImage(t){const e=window.qartSetImage(t);if(e.error)throw new Error(e.error)}async setPosition(t,e){const n=window.qartSetPosition(t,e);if(n.error)throw new Error(n.error)}async setImageSize(t){const e=window.qartSetImageSize(t);if(e.error)throw new Error(e.error)}async setVersion(t){const e=window.qartSetVersion(t);if(e.error)throw new Error(e.error)}async setMask(t){const e=window.qartSetMask(t);if(e.error)throw new Error(e.error)}async setURL(t){const e=window.qartSetURL(t);if(e.error)throw new Error(e.error)}async reset(){window.qartReset()}async setRand(t){const e=window.qartSetRand(t);if(e.error)throw new Error(e.error)}async setDither(t){const e=window.qartSetDither(t);if(e.error)throw new Error(e.error)}async setOnlyDataBits(t){const e=window.qartSetOnlyDataBits(t);if(e.error)throw new Error(e.error)}};p(T,"instance",null);let at=T;const Ut={errorCorrectionLevel:"H",qrVersion:5,threshold:128,fillColor:"#000000",backgroundColor:"#FFFFFF",imageTransform:{x:0,y:0,scale:1},moduleSize:10,modulePixelSize:3,filter:"threshold",margin:4,rand:!1,dither:!1,onlyDataBits:!1};class qt{constructor(t){p(this,"options");p(this,"wasm",null);p(this,"initialized",!1);this.options={...Ut,...t}}async ensureInitialized(){this.initialized||(this.wasm=await at.getInstance(),this.initialized=!0)}async generateQR(t,e,n){if(await this.ensureInitialized(),!this.wasm)throw new Error("WASM not initialized");const s={...this.options,...n};if(await this.wasm.setURL(t),e){let c;if(typeof e=="string")c=e;else{const d=document.createElement("canvas");d.width=e.width,d.height=e.height,d.getContext("2d").drawImage(e,0,0),c=d.toDataURL()}await this.wasm.setImage(c);const l=s.imageTransform||{x:0,y:0,scale:1};await this.wasm.setPosition(l.x,l.y),await this.wasm.setImageSize(Math.round(l.scale*10))}await this.wasm.setVersion(s.qrVersion),await this.wasm.setMask(s.qrVersion%8),await this.wasm.setRand(s.rand),await this.wasm.setDither(s.dither),await this.wasm.setOnlyDataBits(s.onlyDataBits);const a=await this.wasm.generate(),r=document.createElement("canvas"),o=r.getContext("2d");return new Promise((c,l)=>{const d=new Image;d.onload=()=>{r.width=d.width,r.height=d.height,o.drawImage(d,0,0),c({canvas:r,qrVersion:s.qrVersion,moduleCount:17+s.qrVersion*4,dataCapacity:this.getDataCapacity(s.qrVersion,s.errorCorrectionLevel)})},d.onerror=()=>l(new Error("Failed to load generated QR image")),d.src=a})}async generateQRSVG(t,e,n){if(await this.ensureInitialized(),!this.wasm)throw new Error("WASM not initialized");const s={...this.options,...n};if(await this.wasm.setURL(t),e){let a;if(typeof e=="string")a=e;else{const o=document.createElement("canvas");o.width=e.width,o.height=e.height,o.getContext("2d").drawImage(e,0,0),a=o.toDataURL()}await this.wasm.setImage(a);const r=s.imageTransform||{x:0,y:0,scale:1};await this.wasm.setPosition(r.x,r.y),await this.wasm.setImageSize(Math.round(r.scale*10))}return await this.wasm.setVersion(s.qrVersion),await this.wasm.setMask(s.qrVersion%8),await this.wasm.setRand(s.rand),await this.wasm.setDither(s.dither),await this.wasm.setOnlyDataBits(s.onlyDataBits),await this.wasm.generateSVG()}async generateFromURL(t,e,n){const s=await this.loadImage(e);return this.generateQR(t,s,n)}async moveImage(t,e,n,s,a,r){const o={...this.options,...r},c=o.imageTransform||{x:0,y:0,scale:1},l={...o,imageTransform:{...c,x:c.x+e,y:c.y+n}};return this.generateQR(s,a,l)}async scaleImage(t,e,n,s){const a={...this.options,...s},r=a.imageTransform||{x:0,y:0,scale:1},o={...a,imageTransform:{...r,scale:r.scale*n}};return this.generateQR(t,e,o)}async setImageScale(t,e,n,s){const a={...this.options,...s},r=a.imageTransform||{x:0,y:0,scale:1},o={...a,imageTransform:{...r,scale:n}};return this.generateQR(t,e,o)}async setImagePosition(t,e,n,s,a){const r={...this.options,...a},o=r.imageTransform||{x:0,y:0,scale:1},c={...r,imageTransform:{...o,x:n,y:s}};return this.generateQR(t,e,c)}async increaseQRVersion(t,e,n){const s={...this.options,...n},a=Math.min(40,s.qrVersion+1),r={...s,qrVersion:a};return this.generateQR(t,e,r)}async decreaseQRVersion(t,e,n){const s={...this.options,...n},a=Math.max(1,s.qrVersion-1),r={...s,qrVersion:a};return this.generateQR(t,e,r)}async setQRVersion(t,e,n,s){if(n<1||n>40)throw new Error("QR version must be between 1 and 40");const a={...this.options,...s,qrVersion:n};return this.generateQR(t,e,a)}async setErrorCorrectionLevel(t,e,n,s){const a={...this.options,...s,errorCorrectionLevel:n};return this.generateQR(t,e,a)}loadImage(t){return new Promise((e,n)=>{const s=new Image;s.crossOrigin="anonymous",s.onload=()=>e(s),s.onerror=()=>n(new Error(`Failed to load image: ${t}`)),s.src=t})}getCapacityInfo(t){const e=17+t*4,a=e*e*.6,r=Math.floor(a/8),o={L:.93,M:.85,Q:.75,H:.7},c=Math.max(1,r);return{version:t,moduleCount:e,dataCapacity:{numeric:Math.floor(c*o.L*2.5),alphanumeric:Math.floor(c*o.L*1.5),byte:Math.floor(c*o.L),kanji:Math.floor(c*o.L*.6)},errorCorrectionCapacity:{L:Math.floor(c*(1-o.L)),M:Math.floor(c*(1-o.M)),Q:Math.floor(c*(1-o.Q)),H:Math.floor(c*(1-o.H))}}}getDataCapacity(t,e){const n=17+t*4,r=n*n*.6,o=Math.floor(r/8);return Math.max(1,Math.floor(o*{L:.93,M:.85,Q:.75,H:.7}[e]))}setOptions(t){this.options={...this.options,...t}}getOptions(){return{...this.options}}}const Ht="modulepreload",$t=function(i){return"/"+i},mt={},Qt=function(t,e,n){let s=Promise.resolve();if(e&&e.length>0){document.getElementsByTagName("link");const r=document.querySelector("meta[property=csp-nonce]"),o=(r==null?void 0:r.nonce)||(r==null?void 0:r.getAttribute("nonce"));s=Promise.allSettled(e.map(c=>{if(c=$t(c),c in mt)return;mt[c]=!0;const l=c.endsWith(".css"),d=l?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${c}"]${d}`))return;const f=document.createElement("link");if(f.rel=l?"stylesheet":Ht,l||(f.as="script"),f.crossOrigin="",f.href=c,o&&f.setAttribute("nonce",o),document.head.appendChild(f),l)return new Promise((u,h)=>{f.addEventListener("load",u),f.addEventListener("error",()=>h(new Error(`Unable to preload CSS for ${c}`)))})}))}function a(r){const o=new Event("vite:preloadError",{cancelable:!0});if(o.payload=r,window.dispatchEvent(o),!o.defaultPrevented)throw r}return s.then(r=>{for(const o of r||[])o.status==="rejected"&&a(o.reason);return t().catch(a)})};class S{constructor(t,e,n,s,a){this._legacyCanvasSize=S.DEFAULT_CANVAS_SIZE,this._preferredCamera="environment",this._maxScansPerSecond=25,this._lastScanTimestamp=-1,this._destroyed=this._flashOn=this._paused=this._active=!1,this.$video=t,this.$canvas=document.createElement("canvas"),n&&typeof n=="object"?this._onDecode=e:(console.warn(n||s||a?"You're using a deprecated version of the QrScanner constructor which will be removed in the future":"Note that the type of the scan result passed to onDecode will change in the future. To already switch to the new api today, you can pass returnDetailedScanResult: true."),this._legacyOnDecode=e),e=typeof n=="object"?n:{},this._onDecodeError=e.onDecodeError||(typeof n=="function"?n:this._onDecodeError),this._calculateScanRegion=e.calculateScanRegion||(typeof s=="function"?s:this._calculateScanRegion),this._preferredCamera=e.preferredCamera||a||this._preferredCamera,this._legacyCanvasSize=typeof n=="number"?n:typeof s=="number"?s:this._legacyCanvasSize,this._maxScansPerSecond=e.maxScansPerSecond||this._maxScansPerSecond,this._onPlay=this._onPlay.bind(this),this._onLoadedMetaData=this._onLoadedMetaData.bind(this),this._onVisibilityChange=this._onVisibilityChange.bind(this),this._updateOverlay=this._updateOverlay.bind(this),t.disablePictureInPicture=!0,t.playsInline=!0,t.muted=!0;let r=!1;if(t.hidden&&(t.hidden=!1,r=!0),document.body.contains(t)||(document.body.appendChild(t),r=!0),n=t.parentElement,e.highlightScanRegion||e.highlightCodeOutline){if(s=!!e.overlay,this.$overlay=e.overlay||document.createElement("div"),a=this.$overlay.style,a.position="absolute",a.display="none",a.pointerEvents="none",this.$overlay.classList.add("scan-region-highlight"),!s&&e.highlightScanRegion){this.$overlay.innerHTML='<svg class="scan-region-highlight-svg" viewBox="0 0 238 238" preserveAspectRatio="none" style="position:absolute;width:100%;height:100%;left:0;top:0;fill:none;stroke:#e9b213;stroke-width:4;stroke-linecap:round;stroke-linejoin:round"><path d="M31 2H10a8 8 0 0 0-8 8v21M207 2h21a8 8 0 0 1 8 8v21m0 176v21a8 8 0 0 1-8 8h-21m-176 0H10a8 8 0 0 1-8-8v-21"/></svg>';try{this.$overlay.firstElementChild.animate({transform:["scale(.98)","scale(1.01)"]},{duration:400,iterations:1/0,direction:"alternate",easing:"ease-in-out"})}catch{}n.insertBefore(this.$overlay,this.$video.nextSibling)}e.highlightCodeOutline&&(this.$overlay.insertAdjacentHTML("beforeend",'<svg class="code-outline-highlight" preserveAspectRatio="none" style="display:none;width:100%;height:100%;fill:none;stroke:#e9b213;stroke-width:5;stroke-dasharray:25;stroke-linecap:round;stroke-linejoin:round"><polygon/></svg>'),this.$codeOutlineHighlight=this.$overlay.lastElementChild)}this._scanRegion=this._calculateScanRegion(t),requestAnimationFrame(()=>{let o=window.getComputedStyle(t);o.display==="none"&&(t.style.setProperty("display","block","important"),r=!0),o.visibility!=="visible"&&(t.style.setProperty("visibility","visible","important"),r=!0),r&&(console.warn("QrScanner has overwritten the video hiding style to avoid Safari stopping the playback."),t.style.opacity="0",t.style.width="0",t.style.height="0",this.$overlay&&this.$overlay.parentElement&&this.$overlay.parentElement.removeChild(this.$overlay),delete this.$overlay,delete this.$codeOutlineHighlight),this.$overlay&&this._updateOverlay()}),t.addEventListener("play",this._onPlay),t.addEventListener("loadedmetadata",this._onLoadedMetaData),document.addEventListener("visibilitychange",this._onVisibilityChange),window.addEventListener("resize",this._updateOverlay),this._qrEnginePromise=S.createQrEngine()}static set WORKER_PATH(t){console.warn("Setting QrScanner.WORKER_PATH is not required and not supported anymore. Have a look at the README for new setup instructions.")}static async hasCamera(){try{return!!(await S.listCameras(!1)).length}catch{return!1}}static async listCameras(t=!1){if(!navigator.mediaDevices)return[];let e=async()=>(await navigator.mediaDevices.enumerateDevices()).filter(s=>s.kind==="videoinput"),n;try{t&&(await e()).every(s=>!s.label)&&(n=await navigator.mediaDevices.getUserMedia({audio:!1,video:!0}))}catch{}try{return(await e()).map((s,a)=>({id:s.deviceId,label:s.label||(a===0?"Default Camera":`Camera ${a+1}`)}))}finally{n&&(console.warn("Call listCameras after successfully starting a QR scanner to avoid creating a temporary video stream"),S._stopVideoStream(n))}}async hasFlash(){let t;try{if(this.$video.srcObject){if(!(this.$video.srcObject instanceof MediaStream))return!1;t=this.$video.srcObject}else t=(await this._getCameraStream()).stream;return"torch"in t.getVideoTracks()[0].getSettings()}catch{return!1}finally{t&&t!==this.$video.srcObject&&(console.warn("Call hasFlash after successfully starting the scanner to avoid creating a temporary video stream"),S._stopVideoStream(t))}}isFlashOn(){return this._flashOn}async toggleFlash(){this._flashOn?await this.turnFlashOff():await this.turnFlashOn()}async turnFlashOn(){if(!this._flashOn&&!this._destroyed&&(this._flashOn=!0,this._active&&!this._paused))try{if(!await this.hasFlash())throw"No flash available";await this.$video.srcObject.getVideoTracks()[0].applyConstraints({advanced:[{torch:!0}]})}catch(t){throw this._flashOn=!1,t}}async turnFlashOff(){this._flashOn&&(this._flashOn=!1,await this._restartVideoStream())}destroy(){this.$video.removeEventListener("loadedmetadata",this._onLoadedMetaData),this.$video.removeEventListener("play",this._onPlay),document.removeEventListener("visibilitychange",this._onVisibilityChange),window.removeEventListener("resize",this._updateOverlay),this._destroyed=!0,this._flashOn=!1,this.stop(),S._postWorkerMessage(this._qrEnginePromise,"close")}async start(){if(this._destroyed)throw Error("The QR scanner can not be started as it had been destroyed.");if((!this._active||this._paused)&&(window.location.protocol!=="https:"&&console.warn("The camera stream is only accessible if the page is transferred via https."),this._active=!0,!document.hidden))if(this._paused=!1,this.$video.srcObject)await this.$video.play();else try{let{stream:t,facingMode:e}=await this._getCameraStream();!this._active||this._paused?S._stopVideoStream(t):(this._setVideoMirror(e),this.$video.srcObject=t,await this.$video.play(),this._flashOn&&(this._flashOn=!1,this.turnFlashOn().catch(()=>{})))}catch(t){if(!this._paused)throw this._active=!1,t}}stop(){this.pause(),this._active=!1}async pause(t=!1){if(this._paused=!0,!this._active)return!0;this.$video.pause(),this.$overlay&&(this.$overlay.style.display="none");let e=()=>{this.$video.srcObject instanceof MediaStream&&(S._stopVideoStream(this.$video.srcObject),this.$video.srcObject=null)};return t?(e(),!0):(await new Promise(n=>setTimeout(n,300)),this._paused?(e(),!0):!1)}async setCamera(t){t!==this._preferredCamera&&(this._preferredCamera=t,await this._restartVideoStream())}static async scanImage(t,e,n,s,a=!1,r=!1){let o,c=!1;e&&("scanRegion"in e||"qrEngine"in e||"canvas"in e||"disallowCanvasResizing"in e||"alsoTryWithoutScanRegion"in e||"returnDetailedScanResult"in e)?(o=e.scanRegion,n=e.qrEngine,s=e.canvas,a=e.disallowCanvasResizing||!1,r=e.alsoTryWithoutScanRegion||!1,c=!0):console.warn(e||n||s||a||r?"You're using a deprecated api for scanImage which will be removed in the future.":"Note that the return type of scanImage will change in the future. To already switch to the new api today, you can pass returnDetailedScanResult: true."),e=!!n;try{let l,d;[n,l]=await Promise.all([n||S.createQrEngine(),S._loadImage(t)]),[s,d]=S._drawToCanvas(l,o,s,a);let f;if(n instanceof Worker){let u=n;e||S._postWorkerMessageSync(u,"inversionMode","both"),f=await new Promise((h,v)=>{let E,L,g,w=-1;L=m=>{m.data.id===w&&(u.removeEventListener("message",L),u.removeEventListener("error",g),clearTimeout(E),m.data.data!==null?h({data:m.data.data,cornerPoints:S._convertPoints(m.data.cornerPoints,o)}):v(S.NO_QR_CODE_FOUND))},g=m=>{u.removeEventListener("message",L),u.removeEventListener("error",g),clearTimeout(E),v("Scanner error: "+(m?m.message||m:"Unknown Error"))},u.addEventListener("message",L),u.addEventListener("error",g),E=setTimeout(()=>g("timeout"),1e4);let y=d.getImageData(0,0,s.width,s.height);w=S._postWorkerMessageSync(u,"decode",y,[y.data.buffer])})}else f=await Promise.race([new Promise((u,h)=>window.setTimeout(()=>h("Scanner error: timeout"),1e4)),(async()=>{try{var[u]=await n.detect(s);if(!u)throw S.NO_QR_CODE_FOUND;return{data:u.rawValue,cornerPoints:S._convertPoints(u.cornerPoints,o)}}catch(h){if(u=h.message||h,/not implemented|service unavailable/.test(u))return S._disableBarcodeDetector=!0,S.scanImage(t,{scanRegion:o,canvas:s,disallowCanvasResizing:a,alsoTryWithoutScanRegion:r});throw`Scanner error: ${u}`}})()]);return c?f:f.data}catch(l){if(!o||!r)throw l;let d=await S.scanImage(t,{qrEngine:n,canvas:s,disallowCanvasResizing:a});return c?d:d.data}finally{e||S._postWorkerMessage(n,"close")}}setGrayscaleWeights(t,e,n,s=!0){S._postWorkerMessage(this._qrEnginePromise,"grayscaleWeights",{red:t,green:e,blue:n,useIntegerApproximation:s})}setInversionMode(t){S._postWorkerMessage(this._qrEnginePromise,"inversionMode",t)}static async createQrEngine(t){if(t&&console.warn("Specifying a worker path is not required and not supported anymore."),t=()=>Qt(()=>import("./qr-scanner-worker.min-D85Z9gVD.js"),[]).then(n=>n.createWorker()),!(!S._disableBarcodeDetector&&"BarcodeDetector"in window&&BarcodeDetector.getSupportedFormats&&(await BarcodeDetector.getSupportedFormats()).includes("qr_code")))return t();let e=navigator.userAgentData;return e&&e.brands.some(({brand:n})=>/Chromium/i.test(n))&&/mac ?OS/i.test(e.platform)&&await e.getHighEntropyValues(["architecture","platformVersion"]).then(({architecture:n,platformVersion:s})=>/arm/i.test(n||"arm")&&13<=parseInt(s||"13")).catch(()=>!0)?t():new BarcodeDetector({formats:["qr_code"]})}_onPlay(){this._scanRegion=this._calculateScanRegion(this.$video),this._updateOverlay(),this.$overlay&&(this.$overlay.style.display=""),this._scanFrame()}_onLoadedMetaData(){this._scanRegion=this._calculateScanRegion(this.$video),this._updateOverlay()}_onVisibilityChange(){document.hidden?this.pause():this._active&&this.start()}_calculateScanRegion(t){let e=Math.round(.6666666666666666*Math.min(t.videoWidth,t.videoHeight));return{x:Math.round((t.videoWidth-e)/2),y:Math.round((t.videoHeight-e)/2),width:e,height:e,downScaledWidth:this._legacyCanvasSize,downScaledHeight:this._legacyCanvasSize}}_updateOverlay(){requestAnimationFrame(()=>{if(this.$overlay){var t=this.$video,e=t.videoWidth,n=t.videoHeight,s=t.offsetWidth,a=t.offsetHeight,r=t.offsetLeft,o=t.offsetTop,c=window.getComputedStyle(t),l=c.objectFit,d=e/n,f=s/a;switch(l){case"none":var u=e,h=n;break;case"fill":u=s,h=a;break;default:(l==="cover"?d>f:d<f)?(h=a,u=h*d):(u=s,h=u/d),l==="scale-down"&&(u=Math.min(u,e),h=Math.min(h,n))}var[v,E]=c.objectPosition.split(" ").map((g,w)=>{const y=parseFloat(g);return g.endsWith("%")?(w?a-h:s-u)*y/100:y});c=this._scanRegion.width||e,f=this._scanRegion.height||n,l=this._scanRegion.x||0;var L=this._scanRegion.y||0;d=this.$overlay.style,d.width=`${c/e*u}px`,d.height=`${f/n*h}px`,d.top=`${o+E+L/n*h}px`,n=/scaleX\(-1\)/.test(t.style.transform),d.left=`${r+(n?s-v-u:v)+(n?e-l-c:l)/e*u}px`,d.transform=t.style.transform}})}static _convertPoints(t,e){if(!e)return t;let n=e.x||0,s=e.y||0,a=e.width&&e.downScaledWidth?e.width/e.downScaledWidth:1;e=e.height&&e.downScaledHeight?e.height/e.downScaledHeight:1;for(let r of t)r.x=r.x*a+n,r.y=r.y*e+s;return t}_scanFrame(){!this._active||this.$video.paused||this.$video.ended||("requestVideoFrameCallback"in this.$video?this.$video.requestVideoFrameCallback.bind(this.$video):requestAnimationFrame)(async()=>{if(!(1>=this.$video.readyState)){var t=Date.now()-this._lastScanTimestamp,e=1e3/this._maxScansPerSecond;t<e&&await new Promise(s=>setTimeout(s,e-t)),this._lastScanTimestamp=Date.now();try{var n=await S.scanImage(this.$video,{scanRegion:this._scanRegion,qrEngine:this._qrEnginePromise,canvas:this.$canvas})}catch(s){if(!this._active)return;this._onDecodeError(s)}!S._disableBarcodeDetector||await this._qrEnginePromise instanceof Worker||(this._qrEnginePromise=S.createQrEngine()),n?(this._onDecode?this._onDecode(n):this._legacyOnDecode&&this._legacyOnDecode(n.data),this.$codeOutlineHighlight&&(clearTimeout(this._codeOutlineHighlightRemovalTimeout),this._codeOutlineHighlightRemovalTimeout=void 0,this.$codeOutlineHighlight.setAttribute("viewBox",`${this._scanRegion.x||0} ${this._scanRegion.y||0} ${this._scanRegion.width||this.$video.videoWidth} ${this._scanRegion.height||this.$video.videoHeight}`),this.$codeOutlineHighlight.firstElementChild.setAttribute("points",n.cornerPoints.map(({x:s,y:a})=>`${s},${a}`).join(" ")),this.$codeOutlineHighlight.style.display="")):this.$codeOutlineHighlight&&!this._codeOutlineHighlightRemovalTimeout&&(this._codeOutlineHighlightRemovalTimeout=setTimeout(()=>this.$codeOutlineHighlight.style.display="none",100))}this._scanFrame()})}_onDecodeError(t){t!==S.NO_QR_CODE_FOUND&&console.log(t)}async _getCameraStream(){if(!navigator.mediaDevices)throw"Camera not found.";let t=/^(environment|user)$/.test(this._preferredCamera)?"facingMode":"deviceId",e=[{width:{min:1024}},{width:{min:768}},{}],n=e.map(s=>Object.assign({},s,{[t]:{exact:this._preferredCamera}}));for(let s of[...n,...e])try{let a=await navigator.mediaDevices.getUserMedia({video:s,audio:!1}),r=this._getFacingMode(a)||(s.facingMode?this._preferredCamera:this._preferredCamera==="environment"?"user":"environment");return{stream:a,facingMode:r}}catch{}throw"Camera not found."}async _restartVideoStream(){let t=this._paused;await this.pause(!0)&&!t&&this._active&&await this.start()}static _stopVideoStream(t){for(let e of t.getTracks())e.stop(),t.removeTrack(e)}_setVideoMirror(t){this.$video.style.transform="scaleX("+(t==="user"?-1:1)+")"}_getFacingMode(t){return(t=t.getVideoTracks()[0])?/rear|back|environment/i.test(t.label)?"environment":/front|user|face/i.test(t.label)?"user":null:null}static _drawToCanvas(t,e,n,s=!1){n=n||document.createElement("canvas");let a=e&&e.x?e.x:0,r=e&&e.y?e.y:0,o=e&&e.width?e.width:t.videoWidth||t.width,c=e&&e.height?e.height:t.videoHeight||t.height;return s||(s=e&&e.downScaledWidth?e.downScaledWidth:o,e=e&&e.downScaledHeight?e.downScaledHeight:c,n.width!==s&&(n.width=s),n.height!==e&&(n.height=e)),e=n.getContext("2d",{alpha:!1}),e.imageSmoothingEnabled=!1,e.drawImage(t,a,r,o,c,0,0,n.width,n.height),[n,e]}static async _loadImage(t){if(t instanceof Image)return await S._awaitImageLoad(t),t;if(t instanceof HTMLVideoElement||t instanceof HTMLCanvasElement||t instanceof SVGImageElement||"OffscreenCanvas"in window&&t instanceof OffscreenCanvas||"ImageBitmap"in window&&t instanceof ImageBitmap)return t;if(t instanceof File||t instanceof Blob||t instanceof URL||typeof t=="string"){let e=new Image;e.src=t instanceof File||t instanceof Blob?URL.createObjectURL(t):t.toString();try{return await S._awaitImageLoad(e),e}finally{(t instanceof File||t instanceof Blob)&&URL.revokeObjectURL(e.src)}}else throw"Unsupported image type."}static async _awaitImageLoad(t){t.complete&&t.naturalWidth!==0||await new Promise((e,n)=>{let s=a=>{t.removeEventListener("load",s),t.removeEventListener("error",s),a instanceof ErrorEvent?n("Image load error"):e()};t.addEventListener("load",s),t.addEventListener("error",s)})}static async _postWorkerMessage(t,e,n,s){return S._postWorkerMessageSync(await t,e,n,s)}static _postWorkerMessageSync(t,e,n,s){if(!(t instanceof Worker))return-1;let a=S._workerMessageId++;return t.postMessage({id:a,type:e,data:n},s),a}}S.DEFAULT_CANVAS_SIZE=400;S.NO_QR_CODE_FOUND="No QR code found";S._disableBarcodeDetector=!1;S._workerMessageId=0;class ft{constructor(t,e={}){p(this,"scanner");p(this,"videoElement");p(this,"onScanCallback");this.videoElement=t,this.scanner=new S(t,n=>{this.onScanCallback&&this.onScanCallback({data:n.data,cornerPoints:n.cornerPoints})},{maxScansPerSecond:e.maxScansPerSecond||10,preferredCamera:e.preferredCamera||"environment",onDecodeError:n=>{e.onError&&e.onError(n instanceof Error?n:new Error(String(n)))}}),e.onDecode&&(this.onScanCallback=e.onDecode)}async start(){await this.scanner.start()}stop(){this.scanner.stop()}static async hasCamera(){return await S.hasCamera()}static async listCameras(){return(await S.listCameras()).map(e=>({id:e.id,label:e.label}))}async setCamera(t){await this.scanner.setCamera(t)}async toggleFlash(){await this.scanner.hasFlash()&&(this.scanner.isFlashOn()?await this.scanner.turnFlashOff():await this.scanner.turnFlashOn())}isFlashOn(){return this.scanner.isFlashOn()}onScan(t){this.onScanCallback=t}static async scanImage(t){try{const e=await S.scanImage(t,{returnDetailedScanResult:!0});return{success:!0,data:{data:e.data,cornerPoints:e.cornerPoints}}}catch(e){let n="no-qr-found",s="No QR code found in image";return e instanceof Error&&(e.message.includes("No QR code")?(n="no-qr-found",s="No QR code found in image"):e.message.includes("Failed to load")||e.message.includes("Invalid")?(n="invalid-image",s="Failed to load image"):(n="camera-error",s=e.message)),{success:!1,error:n,message:s}}}destroy(){this.scanner.destroy()}}class zt{constructor(t,e){p(this,"data");p(this,"fragmentSize");p(this,"sequenceNumber",0);p(this,"step");p(this,"originalDataLength");if(this.fragmentSize=e.maxFragmentLength,this.originalDataLength=t.length,e.sequenceLength&&e.sequenceLength>0){const n=e.sequenceLength*this.fragmentSize;if(n>t.length){const s=new Uint8Array(n);s.set(t),t=s}}else{const n=Math.ceil(t.length/this.fragmentSize)*this.fragmentSize,s=new Uint8Array(n);s.set(t),t=s}this.data=t,this.step=this.fragmentSize}nextPart(){const t=this.data.length;if(t===0)throw new Error("Cannot encode empty data");const e=this.sequenceNumber*this.step%t,n=new Uint8Array(this.fragmentSize);for(let s=0;s<this.fragmentSize;s++)n[s]=this.data[(e+s)%t];return n.seqNum=this.sequenceNumber,n.totalLength=t,n.step=this.step,n.originalDataLength=this.originalDataLength,this.sequenceNumber++,n}getFragmentCount(){return Math.ceil(this.data.length/this.fragmentSize)}reset(){this.sequenceNumber=0}}class jt{constructor(){p(this,"result",null);p(this,"totalLength",0);p(this,"fragmentSize",0);p(this,"step",0);p(this,"originalDataLength",0);p(this,"covered",new Set);p(this,"complete",!1)}receivePart(t){if(this.complete)return!0;const e=t.seqNum??0,n=t.totalLength??0,s=t.step??0,a=t.originalDataLength??0;if(this.totalLength===0&&n>0&&(this.totalLength=n,this.result=new Uint8Array(n),this.fragmentSize=t.length,this.originalDataLength=a||n,this.step=s>0?s:this.fragmentSize),this.totalLength===0||!this.result)return!1;const r=e*this.step%this.totalLength;for(let o=0;o<t.length;o++){const c=(r+o)%this.totalLength;this.result[c]=t[o],this.covered.add(c)}return this.covered.size>=this.totalLength&&(this.complete=!0),this.complete}getProgress(){return this.totalLength===0?0:this.complete?1:this.covered.size/this.totalLength}getResult(){if(!this.complete||!this.result)throw new Error("Decoding not complete");return this.originalDataLength>0&&this.originalDataLength<this.totalLength?this.result.slice(0,this.originalDataLength):this.result}isComplete(){return this.complete}reset(){this.result=null,this.totalLength=0,this.fragmentSize=0,this.step=0,this.originalDataLength=0,this.covered.clear(),this.complete=!1}}class pt{constructor(t,e={}){p(this,"fountainEncoder");p(this,"type","bytes");p(this,"sequenceLength");p(this,"currentSequence",0);const n=e.maxFragmentLength||100;this.fountainEncoder=new zt(t,{maxFragmentLength:n,sequenceLength:e.sequenceLength}),this.sequenceLength=e.sequenceLength??this.fountainEncoder.getFragmentCount()}nextPart(){const t=this.fountainEncoder.nextPart();return this.currentSequence++,{type:this.type,sequenceNumber:this.currentSequence,sequenceLength:this.sequenceLength,data:t}}getFragmentCount(){return this.sequenceLength}reset(){this.fountainEncoder.reset(),this.currentSequence=0}}class Gt{constructor(){p(this,"fountainDecoder");p(this,"complete",!1);this.fountainDecoder=new jt}receivePart(t){return this.complete?!0:(t.data.originalDataLength=t.data.originalDataLength??0,this.fountainDecoder.receivePart(t.data)&&(this.complete=!0),this.complete)}getProgress(){return this.fountainDecoder.getProgress()}getEstimatedFragmentsRemaining(){const t=this.getProgress();return t>=1?0:Math.ceil((1-t)*10)}getResult(){if(!this.complete)throw new Error("Decoding not complete");return this.fountainDecoder.getResult()}isComplete(){return this.complete}reset(){this.fountainDecoder.reset(),this.complete=!1}}const Wt={1:{L:17,M:14,Q:11,H:7},2:{L:32,M:26,Q:20,H:14},3:{L:53,M:42,Q:32,H:24},4:{L:78,M:62,Q:46,H:34},5:{L:106,M:84,Q:60,H:44},6:{L:134,M:106,Q:74,H:58},7:{L:154,M:122,Q:86,H:64},8:{L:192,M:152,Q:108,H:84},9:{L:230,M:180,Q:130,H:98},10:{L:271,M:213,Q:151,H:119},11:{L:321,M:251,Q:177,H:137},12:{L:367,M:287,Q:203,H:155},13:{L:425,M:331,Q:241,H:177},14:{L:458,M:362,Q:258,H:194},15:{L:520,M:412,Q:292,H:220},16:{L:586,M:450,Q:322,H:250},17:{L:644,M:504,Q:364,H:280},18:{L:718,M:560,Q:394,H:310},19:{L:792,M:624,Q:442,H:338},20:{L:858,M:666,Q:482,H:382}},Yt={L:1.2,M:1.5,Q:2,H:2.5};class Kt{constructor(t={}){p(this,"qrVersion");p(this,"ecLevel");p(this,"totalFrameCount",0);this.qrVersion=t.qrVersion||5,this.ecLevel=t.errorCorrectionLevel||"H"}calculateFragmentSize(t){var n;const e=((n=Wt[t])==null?void 0:n[this.ecLevel])||50;return Math.max(20,e-20)}calculateRedundancy(t){return Yt[t]||1.5}async generateFrames(t,e,n){const s=new TextEncoder().encode(t),a=new Uint8Array(6),r=new DataView(a.buffer);r.setUint32(0,s.length,!1);const o=new Uint8Array(6+s.length);o.set(a,0),o.set(s,6);const c=this.calculateFragmentSize(e),l=new pt(o,{maxFragmentLength:c}),d=Math.ceil(l.getFragmentCount()*this.calculateRedundancy(n));r.setUint16(4,d,!1);const f=new Uint8Array(6+s.length);f.set(a,0),f.set(s,6);const u=new pt(f,{maxFragmentLength:c,sequenceLength:d});this.totalFrameCount=d;const h=[],v=f.length;for(let E=0;E<d;E++){const L=u.nextPart();L.data.originalDataLength=v;const g=this.encodeURFragment(L);h.push(g)}return h}getTotalFrameCount(){return this.totalFrameCount}encodeURFragment(t){const e=Array.from(t.data).map(n=>n.toString(16).padStart(2,"0")).join("");return`ur:${t.type}/${t.sequenceNumber}-${t.sequenceLength}/${e}`}}class Jt{constructor(t={}){p(this,"urDecoder");p(this,"onProgressCallback");p(this,"onCompleteCallback");p(this,"onFrameCallback");p(this,"frameCount",0);p(this,"seenSequences",new Set);p(this,"totalSequenceLength",null);this.urDecoder=new Gt,this.onProgressCallback=t.onProgress,this.onCompleteCallback=t.onComplete,this.onFrameCallback=t.onFrame}receiveFragment(t){if(this.urDecoder.isComplete())return;const e=this.parseURFragment(t);if(this.totalSequenceLength===null&&(this.totalSequenceLength=e.sequenceLength),this.seenSequences.has(e.sequenceNumber))return;this.seenSequences.add(e.sequenceNumber),e.data.seqNum=e.sequenceNumber-1,e.data.totalLength=e.data.length*e.sequenceLength,e.data.originalDataLength=e.data.length*e.sequenceLength;const n=this.urDecoder.receivePart(e);this.frameCount++,this.onFrameCallback&&this.onFrameCallback(this.frameCount);const s=this.getProgress();if(this.onProgressCallback&&this.onProgressCallback(s),n&&this.onCompleteCallback){const a=this.urDecoder.getResult();if(a.length<6){this.onCompleteCallback("");return}const o=new DataView(a.buffer,a.byteOffset,a.byteLength).getUint32(0,!1);if(a.length<6+o){this.onCompleteCallback("");return}const c=a.slice(6,6+o),l=new TextDecoder().decode(c);this.onCompleteCallback(l)}}parseURFragment(t){const e=t.match(/^ur:([^\/]+)\/(\d+)-(\d+)\/(.+)$/);if(!e)throw new Error("Invalid UR fragment format");const[,n,s,a,r]=e;if(!/^[0-9a-fA-F]*$/.test(r))throw new Error("Invalid hex characters in UR fragment");if(r.length%2!==0)throw new Error("Hex string must have even length");const o=new Uint8Array(r.length/2);for(let c=0;c<r.length;c+=2)o[c/2]=parseInt(r.substring(c,c+2),16);return{type:n,sequenceNumber:parseInt(s,10),sequenceLength:parseInt(a,10),data:o}}getProgress(){const t=this.urDecoder.getProgress(),e=this.totalSequenceLength!==null?this.totalSequenceLength:Math.ceil(this.frameCount/Math.max(t,.1));return{receivedFragments:this.frameCount,estimatedTotalFragments:e,totalFrameCount:this.totalSequenceLength??void 0,percentage:Math.round(t*100),isComplete:this.urDecoder.isComplete()}}reset(){this.urDecoder.reset(),this.frameCount=0,this.seenSequences.clear(),this.totalSequenceLength=null}}var H={},Xt=function(){return typeof Promise=="function"&&Promise.prototype&&Promise.prototype.then},Et={},_={};let lt;const Zt=[0,26,44,70,100,134,172,196,242,292,346,404,466,532,581,655,733,815,901,991,1085,1156,1258,1364,1474,1588,1706,1828,1921,2051,2185,2323,2465,2611,2761,2876,3034,3196,3362,3532,3706];_.getSymbolSize=function(t){if(!t)throw new Error('"version" cannot be null or undefined');if(t<1||t>40)throw new Error('"version" should be in range from 1 to 40');return t*4+17};_.getSymbolTotalCodewords=function(t){return Zt[t]};_.getBCHDigit=function(i){let t=0;for(;i!==0;)t++,i>>>=1;return t};_.setToSJISFunction=function(t){if(typeof t!="function")throw new Error('"toSJISFunc" is not a valid function.');lt=t};_.isKanjiModeEnabled=function(){return typeof lt<"u"};_.toSJIS=function(t){return lt(t)};var W={};(function(i){i.L={bit:1},i.M={bit:0},i.Q={bit:3},i.H={bit:2};function t(e){if(typeof e!="string")throw new Error("Param is not a string");switch(e.toLowerCase()){case"l":case"low":return i.L;case"m":case"medium":return i.M;case"q":case"quartile":return i.Q;case"h":case"high":return i.H;default:throw new Error("Unknown EC Level: "+e)}}i.isValid=function(n){return n&&typeof n.bit<"u"&&n.bit>=0&&n.bit<4},i.from=function(n,s){if(i.isValid(n))return n;try{return t(n)}catch{return s}}})(W);function Ct(){this.buffer=[],this.length=0}Ct.prototype={get:function(i){const t=Math.floor(i/8);return(this.buffer[t]>>>7-i%8&1)===1},put:function(i,t){for(let e=0;e<t;e++)this.putBit((i>>>t-e-1&1)===1)},getLengthInBits:function(){return this.length},putBit:function(i){const t=Math.floor(this.length/8);this.buffer.length<=t&&this.buffer.push(0),i&&(this.buffer[t]|=128>>>this.length%8),this.length++}};var te=Ct;function $(i){if(!i||i<1)throw new Error("BitMatrix size must be defined and greater than 0");this.size=i,this.data=new Uint8Array(i*i),this.reservedBit=new Uint8Array(i*i)}$.prototype.set=function(i,t,e,n){const s=i*this.size+t;this.data[s]=e,n&&(this.reservedBit[s]=!0)};$.prototype.get=function(i,t){return this.data[i*this.size+t]};$.prototype.xor=function(i,t,e){this.data[i*this.size+t]^=e};$.prototype.isReserved=function(i,t){return this.reservedBit[i*this.size+t]};var ee=$,St={};(function(i){const t=_.getSymbolSize;i.getRowColCoords=function(n){if(n===1)return[];const s=Math.floor(n/7)+2,a=t(n),r=a===145?26:Math.ceil((a-13)/(2*s-2))*2,o=[a-7];for(let c=1;c<s-1;c++)o[c]=o[c-1]-r;return o.push(6),o.reverse()},i.getPositions=function(n){const s=[],a=i.getRowColCoords(n),r=a.length;for(let o=0;o<r;o++)for(let c=0;c<r;c++)o===0&&c===0||o===0&&c===r-1||o===r-1&&c===0||s.push([a[o],a[c]]);return s}})(St);var It={};const ne=_.getSymbolSize,yt=7;It.getPositions=function(t){const e=ne(t);return[[0,0],[e-yt,0],[0,e-yt]]};var Lt={};(function(i){i.Patterns={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};const t={N1:3,N2:3,N3:40,N4:10};i.isValid=function(s){return s!=null&&s!==""&&!isNaN(s)&&s>=0&&s<=7},i.from=function(s){return i.isValid(s)?parseInt(s,10):void 0},i.getPenaltyN1=function(s){const a=s.size;let r=0,o=0,c=0,l=null,d=null;for(let f=0;f<a;f++){o=c=0,l=d=null;for(let u=0;u<a;u++){let h=s.get(f,u);h===l?o++:(o>=5&&(r+=t.N1+(o-5)),l=h,o=1),h=s.get(u,f),h===d?c++:(c>=5&&(r+=t.N1+(c-5)),d=h,c=1)}o>=5&&(r+=t.N1+(o-5)),c>=5&&(r+=t.N1+(c-5))}return r},i.getPenaltyN2=function(s){const a=s.size;let r=0;for(let o=0;o<a-1;o++)for(let c=0;c<a-1;c++){const l=s.get(o,c)+s.get(o,c+1)+s.get(o+1,c)+s.get(o+1,c+1);(l===4||l===0)&&r++}return r*t.N2},i.getPenaltyN3=function(s){const a=s.size;let r=0,o=0,c=0;for(let l=0;l<a;l++){o=c=0;for(let d=0;d<a;d++)o=o<<1&2047|s.get(l,d),d>=10&&(o===1488||o===93)&&r++,c=c<<1&2047|s.get(d,l),d>=10&&(c===1488||c===93)&&r++}return r*t.N3},i.getPenaltyN4=function(s){let a=0;const r=s.data.length;for(let c=0;c<r;c++)a+=s.data[c];return Math.abs(Math.ceil(a*100/r/5)-10)*t.N4};function e(n,s,a){switch(n){case i.Patterns.PATTERN000:return(s+a)%2===0;case i.Patterns.PATTERN001:return s%2===0;case i.Patterns.PATTERN010:return a%3===0;case i.Patterns.PATTERN011:return(s+a)%3===0;case i.Patterns.PATTERN100:return(Math.floor(s/2)+Math.floor(a/3))%2===0;case i.Patterns.PATTERN101:return s*a%2+s*a%3===0;case i.Patterns.PATTERN110:return(s*a%2+s*a%3)%2===0;case i.Patterns.PATTERN111:return(s*a%3+(s+a)%2)%2===0;default:throw new Error("bad maskPattern:"+n)}}i.applyMask=function(s,a){const r=a.size;for(let o=0;o<r;o++)for(let c=0;c<r;c++)a.isReserved(c,o)||a.xor(c,o,e(s,c,o))},i.getBestMask=function(s,a){const r=Object.keys(i.Patterns).length;let o=0,c=1/0;for(let l=0;l<r;l++){a(l),i.applyMask(l,s);const d=i.getPenaltyN1(s)+i.getPenaltyN2(s)+i.getPenaltyN3(s)+i.getPenaltyN4(s);i.applyMask(l,s),d<c&&(c=d,o=l)}return o}})(Lt);var Y={};const P=W,Q=[1,1,1,1,1,1,1,1,1,1,2,2,1,2,2,4,1,2,4,4,2,4,4,4,2,4,6,5,2,4,6,6,2,5,8,8,4,5,8,8,4,5,8,11,4,8,10,11,4,9,12,16,4,9,16,16,6,10,12,18,6,10,17,16,6,11,16,19,6,13,18,21,7,14,21,25,8,16,20,25,8,17,23,25,9,17,23,34,9,18,25,30,10,20,27,32,12,21,29,35,12,23,34,37,12,25,34,40,13,26,35,42,14,28,38,45,15,29,40,48,16,31,43,51,17,33,45,54,18,35,48,57,19,37,51,60,19,38,53,63,20,40,56,66,21,43,59,70,22,45,62,74,24,47,65,77,25,49,68,81],z=[7,10,13,17,10,16,22,28,15,26,36,44,20,36,52,64,26,48,72,88,36,64,96,112,40,72,108,130,48,88,132,156,60,110,160,192,72,130,192,224,80,150,224,264,96,176,260,308,104,198,288,352,120,216,320,384,132,240,360,432,144,280,408,480,168,308,448,532,180,338,504,588,196,364,546,650,224,416,600,700,224,442,644,750,252,476,690,816,270,504,750,900,300,560,810,960,312,588,870,1050,336,644,952,1110,360,700,1020,1200,390,728,1050,1260,420,784,1140,1350,450,812,1200,1440,480,868,1290,1530,510,924,1350,1620,540,980,1440,1710,570,1036,1530,1800,570,1064,1590,1890,600,1120,1680,1980,630,1204,1770,2100,660,1260,1860,2220,720,1316,1950,2310,750,1372,2040,2430];Y.getBlocksCount=function(t,e){switch(e){case P.L:return Q[(t-1)*4+0];case P.M:return Q[(t-1)*4+1];case P.Q:return Q[(t-1)*4+2];case P.H:return Q[(t-1)*4+3];default:return}};Y.getTotalCodewordsCount=function(t,e){switch(e){case P.L:return z[(t-1)*4+0];case P.M:return z[(t-1)*4+1];case P.Q:return z[(t-1)*4+2];case P.H:return z[(t-1)*4+3];default:return}};var bt={},K={};const U=new Uint8Array(512),j=new Uint8Array(256);(function(){let t=1;for(let e=0;e<255;e++)U[e]=t,j[t]=e,t<<=1,t&256&&(t^=285);for(let e=255;e<512;e++)U[e]=U[e-255]})();K.log=function(t){if(t<1)throw new Error("log("+t+")");return j[t]};K.exp=function(t){return U[t]};K.mul=function(t,e){return t===0||e===0?0:U[j[t]+j[e]]};(function(i){const t=K;i.mul=function(n,s){const a=new Uint8Array(n.length+s.length-1);for(let r=0;r<n.length;r++)for(let o=0;o<s.length;o++)a[r+o]^=t.mul(n[r],s[o]);return a},i.mod=function(n,s){let a=new Uint8Array(n);for(;a.length-s.length>=0;){const r=a[0];for(let c=0;c<s.length;c++)a[c]^=t.mul(s[c],r);let o=0;for(;o<a.length&&a[o]===0;)o++;a=a.slice(o)}return a},i.generateECPolynomial=function(n){let s=new Uint8Array([1]);for(let a=0;a<n;a++)s=i.mul(s,new Uint8Array([1,t.exp(a)]));return s}})(bt);const Bt=bt;function dt(i){this.genPoly=void 0,this.degree=i,this.degree&&this.initialize(this.degree)}dt.prototype.initialize=function(t){this.degree=t,this.genPoly=Bt.generateECPolynomial(this.degree)};dt.prototype.encode=function(t){if(!this.genPoly)throw new Error("Encoder not initialized");const e=new Uint8Array(t.length+this.degree);e.set(t);const n=Bt.mod(e,this.genPoly),s=this.degree-n.length;if(s>0){const a=new Uint8Array(this.degree);return a.set(n,s),a}return n};var se=dt,_t={},D={},ut={};ut.isValid=function(t){return!isNaN(t)&&t>=1&&t<=40};var R={};const Mt="[0-9]+",ae="[A-Z $%*+\\-./:]+";let q="(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";q=q.replace(/u/g,"\\u");const re="(?:(?![A-Z0-9 $%*+\\-./:]|"+q+`)(?:.|[\r
]))+`;R.KANJI=new RegExp(q,"g");R.BYTE_KANJI=new RegExp("[^A-Z0-9 $%*+\\-./:]+","g");R.BYTE=new RegExp(re,"g");R.NUMERIC=new RegExp(Mt,"g");R.ALPHANUMERIC=new RegExp(ae,"g");const ie=new RegExp("^"+q+"$"),oe=new RegExp("^"+Mt+"$"),ce=new RegExp("^[A-Z0-9 $%*+\\-./:]+$");R.testKanji=function(t){return ie.test(t)};R.testNumeric=function(t){return oe.test(t)};R.testAlphanumeric=function(t){return ce.test(t)};(function(i){const t=ut,e=R;i.NUMERIC={id:"Numeric",bit:1,ccBits:[10,12,14]},i.ALPHANUMERIC={id:"Alphanumeric",bit:2,ccBits:[9,11,13]},i.BYTE={id:"Byte",bit:4,ccBits:[8,16,16]},i.KANJI={id:"Kanji",bit:8,ccBits:[8,10,12]},i.MIXED={bit:-1},i.getCharCountIndicator=function(a,r){if(!a.ccBits)throw new Error("Invalid mode: "+a);if(!t.isValid(r))throw new Error("Invalid version: "+r);return r>=1&&r<10?a.ccBits[0]:r<27?a.ccBits[1]:a.ccBits[2]},i.getBestModeForData=function(a){return e.testNumeric(a)?i.NUMERIC:e.testAlphanumeric(a)?i.ALPHANUMERIC:e.testKanji(a)?i.KANJI:i.BYTE},i.toString=function(a){if(a&&a.id)return a.id;throw new Error("Invalid mode")},i.isValid=function(a){return a&&a.bit&&a.ccBits};function n(s){if(typeof s!="string")throw new Error("Param is not a string");switch(s.toLowerCase()){case"numeric":return i.NUMERIC;case"alphanumeric":return i.ALPHANUMERIC;case"kanji":return i.KANJI;case"byte":return i.BYTE;default:throw new Error("Unknown mode: "+s)}}i.from=function(a,r){if(i.isValid(a))return a;try{return n(a)}catch{return r}}})(D);(function(i){const t=_,e=Y,n=W,s=D,a=ut,r=7973,o=t.getBCHDigit(r);function c(u,h,v){for(let E=1;E<=40;E++)if(h<=i.getCapacity(E,v,u))return E}function l(u,h){return s.getCharCountIndicator(u,h)+4}function d(u,h){let v=0;return u.forEach(function(E){const L=l(E.mode,h);v+=L+E.getBitsLength()}),v}function f(u,h){for(let v=1;v<=40;v++)if(d(u,v)<=i.getCapacity(v,h,s.MIXED))return v}i.from=function(h,v){return a.isValid(h)?parseInt(h,10):v},i.getCapacity=function(h,v,E){if(!a.isValid(h))throw new Error("Invalid QR Code version");typeof E>"u"&&(E=s.BYTE);const L=t.getSymbolTotalCodewords(h),g=e.getTotalCodewordsCount(h,v),w=(L-g)*8;if(E===s.MIXED)return w;const y=w-l(E,h);switch(E){case s.NUMERIC:return Math.floor(y/10*3);case s.ALPHANUMERIC:return Math.floor(y/11*2);case s.KANJI:return Math.floor(y/13);case s.BYTE:default:return Math.floor(y/8)}},i.getBestVersionForData=function(h,v){let E;const L=n.from(v,n.M);if(Array.isArray(h)){if(h.length>1)return f(h,L);if(h.length===0)return 1;E=h[0]}else E=h;return c(E.mode,E.getLength(),L)},i.getEncodedBits=function(h){if(!a.isValid(h)||h<7)throw new Error("Invalid QR Code version");let v=h<<12;for(;t.getBCHDigit(v)-o>=0;)v^=r<<t.getBCHDigit(v)-o;return h<<12|v}})(_t);var Rt={};const rt=_,kt=1335,le=21522,wt=rt.getBCHDigit(kt);Rt.getEncodedBits=function(t,e){const n=t.bit<<3|e;let s=n<<10;for(;rt.getBCHDigit(s)-wt>=0;)s^=kt<<rt.getBCHDigit(s)-wt;return(n<<10|s)^le};var Ft={};const de=D;function A(i){this.mode=de.NUMERIC,this.data=i.toString()}A.getBitsLength=function(t){return 10*Math.floor(t/3)+(t%3?t%3*3+1:0)};A.prototype.getLength=function(){return this.data.length};A.prototype.getBitsLength=function(){return A.getBitsLength(this.data.length)};A.prototype.write=function(t){let e,n,s;for(e=0;e+3<=this.data.length;e+=3)n=this.data.substr(e,3),s=parseInt(n,10),t.put(s,10);const a=this.data.length-e;a>0&&(n=this.data.substr(e),s=parseInt(n,10),t.put(s,a*3+1))};var ue=A;const he=D,Z=["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"," ","$","%","*","+","-",".","/",":"];function x(i){this.mode=he.ALPHANUMERIC,this.data=i}x.getBitsLength=function(t){return 11*Math.floor(t/2)+6*(t%2)};x.prototype.getLength=function(){return this.data.length};x.prototype.getBitsLength=function(){return x.getBitsLength(this.data.length)};x.prototype.write=function(t){let e;for(e=0;e+2<=this.data.length;e+=2){let n=Z.indexOf(this.data[e])*45;n+=Z.indexOf(this.data[e+1]),t.put(n,11)}this.data.length%2&&t.put(Z.indexOf(this.data[e]),6)};var ge=x;const me=D;function V(i){this.mode=me.BYTE,typeof i=="string"?this.data=new TextEncoder().encode(i):this.data=new Uint8Array(i)}V.getBitsLength=function(t){return t*8};V.prototype.getLength=function(){return this.data.length};V.prototype.getBitsLength=function(){return V.getBitsLength(this.data.length)};V.prototype.write=function(i){for(let t=0,e=this.data.length;t<e;t++)i.put(this.data[t],8)};var fe=V;const pe=D,ye=_;function O(i){this.mode=pe.KANJI,this.data=i}O.getBitsLength=function(t){return t*13};O.prototype.getLength=function(){return this.data.length};O.prototype.getBitsLength=function(){return O.getBitsLength(this.data.length)};O.prototype.write=function(i){let t;for(t=0;t<this.data.length;t++){let e=ye.toSJIS(this.data[t]);if(e>=33088&&e<=40956)e-=33088;else if(e>=57408&&e<=60351)e-=49472;else throw new Error("Invalid SJIS character: "+this.data[t]+`
Make sure your charset is UTF-8`);e=(e>>>8&255)*192+(e&255),i.put(e,13)}};var we=O,Tt={exports:{}};(function(i){var t={single_source_shortest_paths:function(e,n,s){var a={},r={};r[n]=0;var o=t.PriorityQueue.make();o.push(n,0);for(var c,l,d,f,u,h,v,E,L;!o.empty();){c=o.pop(),l=c.value,f=c.cost,u=e[l]||{};for(d in u)u.hasOwnProperty(d)&&(h=u[d],v=f+h,E=r[d],L=typeof r[d]>"u",(L||E>v)&&(r[d]=v,o.push(d,v),a[d]=l))}if(typeof s<"u"&&typeof r[s]>"u"){var g=["Could not find a path from ",n," to ",s,"."].join("");throw new Error(g)}return a},extract_shortest_path_from_predecessor_list:function(e,n){for(var s=[],a=n;a;)s.push(a),e[a],a=e[a];return s.reverse(),s},find_path:function(e,n,s){var a=t.single_source_shortest_paths(e,n,s);return t.extract_shortest_path_from_predecessor_list(a,s)},PriorityQueue:{make:function(e){var n=t.PriorityQueue,s={},a;e=e||{};for(a in n)n.hasOwnProperty(a)&&(s[a]=n[a]);return s.queue=[],s.sorter=e.sorter||n.default_sorter,s},default_sorter:function(e,n){return e.cost-n.cost},push:function(e,n){var s={value:e,cost:n};this.queue.push(s),this.queue.sort(this.sorter)},pop:function(){return this.queue.shift()},empty:function(){return this.queue.length===0}}};i.exports=t})(Tt);var ve=Tt.exports;(function(i){const t=D,e=ue,n=ge,s=fe,a=we,r=R,o=_,c=ve;function l(g){return unescape(encodeURIComponent(g)).length}function d(g,w,y){const m=[];let I;for(;(I=g.exec(y))!==null;)m.push({data:I[0],index:I.index,mode:w,length:I[0].length});return m}function f(g){const w=d(r.NUMERIC,t.NUMERIC,g),y=d(r.ALPHANUMERIC,t.ALPHANUMERIC,g);let m,I;return o.isKanjiModeEnabled()?(m=d(r.BYTE,t.BYTE,g),I=d(r.KANJI,t.KANJI,g)):(m=d(r.BYTE_KANJI,t.BYTE,g),I=[]),w.concat(y,m,I).sort(function(b,B){return b.index-B.index}).map(function(b){return{data:b.data,mode:b.mode,length:b.length}})}function u(g,w){switch(w){case t.NUMERIC:return e.getBitsLength(g);case t.ALPHANUMERIC:return n.getBitsLength(g);case t.KANJI:return a.getBitsLength(g);case t.BYTE:return s.getBitsLength(g)}}function h(g){return g.reduce(function(w,y){const m=w.length-1>=0?w[w.length-1]:null;return m&&m.mode===y.mode?(w[w.length-1].data+=y.data,w):(w.push(y),w)},[])}function v(g){const w=[];for(let y=0;y<g.length;y++){const m=g[y];switch(m.mode){case t.NUMERIC:w.push([m,{data:m.data,mode:t.ALPHANUMERIC,length:m.length},{data:m.data,mode:t.BYTE,length:m.length}]);break;case t.ALPHANUMERIC:w.push([m,{data:m.data,mode:t.BYTE,length:m.length}]);break;case t.KANJI:w.push([m,{data:m.data,mode:t.BYTE,length:l(m.data)}]);break;case t.BYTE:w.push([{data:m.data,mode:t.BYTE,length:l(m.data)}])}}return w}function E(g,w){const y={},m={start:{}};let I=["start"];for(let C=0;C<g.length;C++){const b=g[C],B=[];for(let F=0;F<b.length;F++){const M=b[F],N=""+C+F;B.push(N),y[N]={node:M,lastCount:0},m[N]={};for(let X=0;X<I.length;X++){const k=I[X];y[k]&&y[k].node.mode===M.mode?(m[k][N]=u(y[k].lastCount+M.length,M.mode)-u(y[k].lastCount,M.mode),y[k].lastCount+=M.length):(y[k]&&(y[k].lastCount=M.length),m[k][N]=u(M.length,M.mode)+4+t.getCharCountIndicator(M.mode,w))}}I=B}for(let C=0;C<I.length;C++)m[I[C]].end=0;return{map:m,table:y}}function L(g,w){let y;const m=t.getBestModeForData(g);if(y=t.from(w,m),y!==t.BYTE&&y.bit<m.bit)throw new Error('"'+g+'" cannot be encoded with mode '+t.toString(y)+`.
 Suggested mode is: `+t.toString(m));switch(y===t.KANJI&&!o.isKanjiModeEnabled()&&(y=t.BYTE),y){case t.NUMERIC:return new e(g);case t.ALPHANUMERIC:return new n(g);case t.KANJI:return new a(g);case t.BYTE:return new s(g)}}i.fromArray=function(w){return w.reduce(function(y,m){return typeof m=="string"?y.push(L(m,null)):m.data&&y.push(L(m.data,m.mode)),y},[])},i.fromString=function(w,y){const m=f(w,o.isKanjiModeEnabled()),I=v(m),C=E(I,y),b=c.find_path(C.map,"start","end"),B=[];for(let F=1;F<b.length-1;F++)B.push(C.table[b[F]].node);return i.fromArray(h(B))},i.rawSplit=function(w){return i.fromArray(f(w,o.isKanjiModeEnabled()))}})(Ft);const J=_,tt=W,Ee=te,Ce=ee,Se=St,Ie=It,it=Lt,ot=Y,Le=se,G=_t,be=Rt,Be=D,et=Ft;function _e(i,t){const e=i.size,n=Ie.getPositions(t);for(let s=0;s<n.length;s++){const a=n[s][0],r=n[s][1];for(let o=-1;o<=7;o++)if(!(a+o<=-1||e<=a+o))for(let c=-1;c<=7;c++)r+c<=-1||e<=r+c||(o>=0&&o<=6&&(c===0||c===6)||c>=0&&c<=6&&(o===0||o===6)||o>=2&&o<=4&&c>=2&&c<=4?i.set(a+o,r+c,!0,!0):i.set(a+o,r+c,!1,!0))}}function Me(i){const t=i.size;for(let e=8;e<t-8;e++){const n=e%2===0;i.set(e,6,n,!0),i.set(6,e,n,!0)}}function Re(i,t){const e=Se.getPositions(t);for(let n=0;n<e.length;n++){const s=e[n][0],a=e[n][1];for(let r=-2;r<=2;r++)for(let o=-2;o<=2;o++)r===-2||r===2||o===-2||o===2||r===0&&o===0?i.set(s+r,a+o,!0,!0):i.set(s+r,a+o,!1,!0)}}function ke(i,t){const e=i.size,n=G.getEncodedBits(t);let s,a,r;for(let o=0;o<18;o++)s=Math.floor(o/3),a=o%3+e-8-3,r=(n>>o&1)===1,i.set(s,a,r,!0),i.set(a,s,r,!0)}function nt(i,t,e){const n=i.size,s=be.getEncodedBits(t,e);let a,r;for(a=0;a<15;a++)r=(s>>a&1)===1,a<6?i.set(a,8,r,!0):a<8?i.set(a+1,8,r,!0):i.set(n-15+a,8,r,!0),a<8?i.set(8,n-a-1,r,!0):a<9?i.set(8,15-a-1+1,r,!0):i.set(8,15-a-1,r,!0);i.set(n-8,8,1,!0)}function Fe(i,t){const e=i.size;let n=-1,s=e-1,a=7,r=0;for(let o=e-1;o>0;o-=2)for(o===6&&o--;;){for(let c=0;c<2;c++)if(!i.isReserved(s,o-c)){let l=!1;r<t.length&&(l=(t[r]>>>a&1)===1),i.set(s,o-c,l),a--,a===-1&&(r++,a=7)}if(s+=n,s<0||e<=s){s-=n,n=-n;break}}}function Te(i,t,e){const n=new Ee;e.forEach(function(c){n.put(c.mode.bit,4),n.put(c.getLength(),Be.getCharCountIndicator(c.mode,i)),c.write(n)});const s=J.getSymbolTotalCodewords(i),a=ot.getTotalCodewordsCount(i,t),r=(s-a)*8;for(n.getLengthInBits()+4<=r&&n.put(0,4);n.getLengthInBits()%8!==0;)n.putBit(0);const o=(r-n.getLengthInBits())/8;for(let c=0;c<o;c++)n.put(c%2?17:236,8);return Pe(n,i,t)}function Pe(i,t,e){const n=J.getSymbolTotalCodewords(t),s=ot.getTotalCodewordsCount(t,e),a=n-s,r=ot.getBlocksCount(t,e),o=n%r,c=r-o,l=Math.floor(n/r),d=Math.floor(a/r),f=d+1,u=l-d,h=new Le(u);let v=0;const E=new Array(r),L=new Array(r);let g=0;const w=new Uint8Array(i.buffer);for(let b=0;b<r;b++){const B=b<c?d:f;E[b]=w.slice(v,v+B),L[b]=h.encode(E[b]),v+=B,g=Math.max(g,B)}const y=new Uint8Array(n);let m=0,I,C;for(I=0;I<g;I++)for(C=0;C<r;C++)I<E[C].length&&(y[m++]=E[C][I]);for(I=0;I<u;I++)for(C=0;C<r;C++)y[m++]=L[C][I];return y}function De(i,t,e,n){let s;if(Array.isArray(i))s=et.fromArray(i);else if(typeof i=="string"){let l=t;if(!l){const d=et.rawSplit(i);l=G.getBestVersionForData(d,e)}s=et.fromString(i,l||40)}else throw new Error("Invalid data");const a=G.getBestVersionForData(s,e);if(!a)throw new Error("The amount of data is too big to be stored in a QR Code");if(!t)t=a;else if(t<a)throw new Error(`
The chosen QR Code version cannot contain this amount of data.
Minimum version required to store current data is: `+a+`.
`);const r=Te(t,e,s),o=J.getSymbolSize(t),c=new Ce(o);return _e(c,t),Me(c),Re(c,t),nt(c,e,0),t>=7&&ke(c,t),Fe(c,r),isNaN(n)&&(n=it.getBestMask(c,nt.bind(null,c,e))),it.applyMask(n,c),nt(c,e,n),{modules:c,version:t,errorCorrectionLevel:e,maskPattern:n,segments:s}}Et.create=function(t,e){if(typeof t>"u"||t==="")throw new Error("No input text");let n=tt.M,s,a;return typeof e<"u"&&(n=tt.from(e.errorCorrectionLevel,tt.M),s=G.from(e.version),a=it.from(e.maskPattern),e.toSJISFunc&&J.setToSJISFunction(e.toSJISFunc)),De(t,s,n,a)};var Pt={},ht={};(function(i){function t(e){if(typeof e=="number"&&(e=e.toString()),typeof e!="string")throw new Error("Color should be defined as hex string");let n=e.slice().replace("#","").split("");if(n.length<3||n.length===5||n.length>8)throw new Error("Invalid hex color: "+e);(n.length===3||n.length===4)&&(n=Array.prototype.concat.apply([],n.map(function(a){return[a,a]}))),n.length===6&&n.push("F","F");const s=parseInt(n.join(""),16);return{r:s>>24&255,g:s>>16&255,b:s>>8&255,a:s&255,hex:"#"+n.slice(0,6).join("")}}i.getOptions=function(n){n||(n={}),n.color||(n.color={});const s=typeof n.margin>"u"||n.margin===null||n.margin<0?4:n.margin,a=n.width&&n.width>=21?n.width:void 0,r=n.scale||4;return{width:a,scale:a?4:r,margin:s,color:{dark:t(n.color.dark||"#000000ff"),light:t(n.color.light||"#ffffffff")},type:n.type,rendererOpts:n.rendererOpts||{}}},i.getScale=function(n,s){return s.width&&s.width>=n+s.margin*2?s.width/(n+s.margin*2):s.scale},i.getImageWidth=function(n,s){const a=i.getScale(n,s);return Math.floor((n+s.margin*2)*a)},i.qrToImageData=function(n,s,a){const r=s.modules.size,o=s.modules.data,c=i.getScale(r,a),l=Math.floor((r+a.margin*2)*c),d=a.margin*c,f=[a.color.light,a.color.dark];for(let u=0;u<l;u++)for(let h=0;h<l;h++){let v=(u*l+h)*4,E=a.color.light;if(u>=d&&h>=d&&u<l-d&&h<l-d){const L=Math.floor((u-d)/c),g=Math.floor((h-d)/c);E=f[o[L*r+g]?1:0]}n[v++]=E.r,n[v++]=E.g,n[v++]=E.b,n[v]=E.a}}})(ht);(function(i){const t=ht;function e(s,a,r){s.clearRect(0,0,a.width,a.height),a.style||(a.style={}),a.height=r,a.width=r,a.style.height=r+"px",a.style.width=r+"px"}function n(){try{return document.createElement("canvas")}catch{throw new Error("You need to specify a canvas element")}}i.render=function(a,r,o){let c=o,l=r;typeof c>"u"&&(!r||!r.getContext)&&(c=r,r=void 0),r||(l=n()),c=t.getOptions(c);const d=t.getImageWidth(a.modules.size,c),f=l.getContext("2d"),u=f.createImageData(d,d);return t.qrToImageData(u.data,a,c),e(f,l,d),f.putImageData(u,0,0),l},i.renderToDataURL=function(a,r,o){let c=o;typeof c>"u"&&(!r||!r.getContext)&&(c=r,r=void 0),c||(c={});const l=i.render(a,r,c),d=c.type||"image/png",f=c.rendererOpts||{};return l.toDataURL(d,f.quality)}})(Pt);var Dt={};const Ae=ht;function vt(i,t){const e=i.a/255,n=t+'="'+i.hex+'"';return e<1?n+" "+t+'-opacity="'+e.toFixed(2).slice(1)+'"':n}function st(i,t,e){let n=i+t;return typeof e<"u"&&(n+=" "+e),n}function xe(i,t,e){let n="",s=0,a=!1,r=0;for(let o=0;o<i.length;o++){const c=Math.floor(o%t),l=Math.floor(o/t);!c&&!a&&(a=!0),i[o]?(r++,o>0&&c>0&&i[o-1]||(n+=a?st("M",c+e,.5+l+e):st("m",s,0),s=0,a=!1),c+1<t&&i[o+1]||(n+=st("h",r),r=0)):s++}return n}Dt.render=function(t,e,n){const s=Ae.getOptions(e),a=t.modules.size,r=t.modules.data,o=a+s.margin*2,c=s.color.light.a?"<path "+vt(s.color.light,"fill")+' d="M0 0h'+o+"v"+o+'H0z"/>':"",l="<path "+vt(s.color.dark,"stroke")+' d="'+xe(r,a,s.margin)+'"/>',d='viewBox="0 0 '+o+" "+o+'"',u='<svg xmlns="http://www.w3.org/2000/svg" '+(s.width?'width="'+s.width+'" height="'+s.width+'" ':"")+d+' shape-rendering="crispEdges">'+c+l+`</svg>
`;return typeof n=="function"&&n(null,u),u};const Ve=Xt,ct=Et,At=Pt,Oe=Dt;function gt(i,t,e,n,s){const a=[].slice.call(arguments,1),r=a.length,o=typeof a[r-1]=="function";if(!o&&!Ve())throw new Error("Callback required as last argument");if(o){if(r<2)throw new Error("Too few arguments provided");r===2?(s=e,e=t,t=n=void 0):r===3&&(t.getContext&&typeof s>"u"?(s=n,n=void 0):(s=n,n=e,e=t,t=void 0))}else{if(r<1)throw new Error("Too few arguments provided");return r===1?(e=t,t=n=void 0):r===2&&!t.getContext&&(n=e,e=t,t=void 0),new Promise(function(c,l){try{const d=ct.create(e,n);c(i(d,t,n))}catch(d){l(d)}})}try{const c=ct.create(e,n);s(null,i(c,t,n))}catch(c){s(c)}}H.create=ct.create;H.toCanvas=gt.bind(null,At.render);H.toDataURL=gt.bind(null,At.renderToDataURL);H.toString=gt.bind(null,function(i,t,e){return Oe.render(i,e)});class Ne{constructor(){p(this,"generator");p(this,"currentImage",null);p(this,"currentData","");p(this,"currentOptions",{});p(this,"currentMode","generate");p(this,"qrScanner");p(this,"fountainEncoder");p(this,"fountainDecoder");p(this,"animationInterval");p(this,"fountainFrames");p(this,"fountainFrameIndex",0);p(this,"isFountainPlaying",!1);p(this,"fountainFillColor","#000000");p(this,"fountainBackgroundColor","#ffffff");p(this,"audioContext");p(this,"currentCameraIndex",0);p(this,"scannerInitialized",!1);this.generator=new qt,this.initializeEventListeners(),this.updateCapacityInfo();const t=document.getElementById("generateBtn");t.disabled=!1,window.addEventListener("pagehide",()=>{var e;(e=this.audioContext)==null||e.close().catch(()=>{}),this.destroyScanner()})}initializeEventListeners(){var y,m,I;const t=document.getElementById("qrData");this.currentData=t.value,t.addEventListener("input",()=>{this.currentData=t.value,this.updateCapacityInfo()}),document.getElementById("imageUpload").addEventListener("change",C=>this.handleImageUpload(C)),document.getElementById("loadImageBtn").addEventListener("click",()=>this.loadImageFromURL()),this.setupSlider("posX","posXValue",C=>{this.currentOptions.imageTransform={...this.currentOptions.imageTransform||{x:0,y:0,scale:1},x:C}}),this.setupSlider("posY","posYValue",C=>{this.currentOptions.imageTransform={...this.currentOptions.imageTransform||{x:0,y:0,scale:1},y:C}}),this.setupSlider("scale","scaleValue",C=>{this.currentOptions.imageTransform={...this.currentOptions.imageTransform||{x:0,y:0,scale:1},scale:C}},!0),this.setupSlider("threshold","thresholdValue",C=>{this.currentOptions.threshold=C}),this.setupSlider("modulePixelSize","modulePixelSizeValue",C=>{this.currentOptions.modulePixelSize=C}),this.setupSlider("version","versionValue",C=>{this.currentOptions.qrVersion=C,this.updateModuleCount(C),this.updateCapacityInfo()}),document.getElementById("decreaseVersion").addEventListener("click",()=>this.adjustVersion(-1)),document.getElementById("increaseVersion").addEventListener("click",()=>this.adjustVersion(1)),document.querySelectorAll('input[name="ecLevel"]').forEach(C=>{C.addEventListener("change",b=>{const B=b.target;this.currentOptions.errorCorrectionLevel=B.value,this.updateCapacityInfo()})}),document.querySelectorAll('input[name="filter"]').forEach(C=>{C.addEventListener("change",b=>{const B=b.target;this.currentOptions.filter=B.value})});const c=document.getElementById("randCheck");c.addEventListener("change",()=>{this.currentOptions.rand=c.checked});const l=document.getElementById("ditherCheck");l.addEventListener("change",()=>{this.currentOptions.dither=l.checked});const d=document.getElementById("onlyDataBitsCheck");d.addEventListener("change",()=>{this.currentOptions.onlyDataBits=d.checked});const f=document.getElementById("fillColor");f.addEventListener("input",()=>{this.currentOptions.fillColor=f.value});const u=document.getElementById("backgroundColor");u.addEventListener("input",()=>{this.currentOptions.backgroundColor=u.value}),document.getElementById("generateBtn").addEventListener("click",()=>this.generateQR()),document.getElementById("downloadBtn").addEventListener("click",()=>this.downloadQR()),document.getElementById("downloadSvgBtn").addEventListener("click",()=>this.downloadSVGG()),document.getElementById("resetBtn").addEventListener("click",()=>this.resetAll());const g=document.getElementById("fountainEnabledInline"),w=document.getElementById("fountainEnabled");g==null||g.addEventListener("change",()=>{w&&(w.checked=g.checked),this.updateFountainMode()}),w==null||w.addEventListener("change",()=>{g&&(g.checked=w.checked),this.updateFountainMode()}),(y=document.getElementById("playPauseBtn"))==null||y.addEventListener("click",()=>{this.toggleFountainAnimation()}),(m=document.getElementById("restartBtn"))==null||m.addEventListener("click",()=>{this.restartFountainAnimation()}),(I=document.getElementById("copyResultBtn"))==null||I.addEventListener("click",()=>{this.copyScanResult()}),document.addEventListener("keydown",C=>this.handleKeyboard(C)),this.initializeModeTabs()}setupSlider(t,e,n,s=!1){const a=document.getElementById(t),r=document.getElementById(e);a.addEventListener("input",()=>{const o=s?parseFloat(a.value):parseInt(a.value);r.textContent=s?o.toFixed(1):o.toString(),n(o)})}async handleImageUpload(t){const e=t.target;if(!e.files||e.files.length===0)return;const n=e.files[0],s=new FileReader;s.onload=a=>{var o;const r=(o=a.target)==null?void 0:o.result;this.loadImage(r)},s.readAsDataURL(n)}async loadImageFromURL(){const e=document.getElementById("imageURL").value.trim();if(!e){alert("Please enter an image URL");return}try{await this.loadImage(e)}catch(n){alert(`Failed to load image: ${n instanceof Error?n.message:"Unknown error"}`)}}async loadImage(t){try{this.currentImage=await this.generator.loadImage(t);const e=document.getElementById("imagePreview"),n=document.getElementById("previewImg");n.src=t,e.classList.remove("hidden");const s=document.getElementById("generateBtn");s.disabled=!1}catch(e){throw console.error("Failed to load image:",e),e}}async generateQR(){if(!this.currentData){alert("Please enter data to encode");return}const t=document.getElementById("fountainEnabledInline");if(t!=null&&t.checked){await this.generateFountainQR();return}const e=document.getElementById("generateBtn");document.getElementById("qrContainer");try{e.classList.add("loading"),e.disabled=!0;const n=await this.generator.generateQR(this.currentData,this.currentImage,this.currentOptions),s=document.getElementById("qrCanvas"),a=document.getElementById("placeholder");s.width=n.canvas.width,s.height=n.canvas.height;const r=s.getContext("2d");r&&r.drawImage(n.canvas,0,0),a.classList.add("hidden"),s.classList.remove("hidden"),document.getElementById("stats").classList.remove("hidden"),document.getElementById("statModules").textContent=n.moduleCount.toString(),document.getElementById("statVersion").textContent=n.qrVersion.toString(),document.getElementById("statCapacity").textContent=n.dataCapacity.toString(),document.getElementById("scanInstructions").classList.remove("hidden");const l=document.getElementById("downloadBtn");l.disabled=!1;const d=document.getElementById("downloadSvgBtn");d.disabled=!1}catch(n){console.error("Failed to generate QR:",n),alert(`Failed to generate QR code: ${n instanceof Error?n.message:"Unknown error"}`)}finally{e.classList.remove("loading"),e.disabled=!1}}downloadQR(){const e=document.getElementById("qrCanvas").toDataURL("image/png"),n=document.createElement("a");n.download=`qart-qr-${Date.now()}.png`,n.href=e,n.click()}async downloadSVGG(){if(!this.currentImage||!this.currentData){alert("Please generate a QR code first");return}try{const t=await this.generator.generateQRSVG(this.currentData,this.currentImage,this.currentOptions),e=new Blob([t],{type:"image/svg+xml"}),n=URL.createObjectURL(e),s=document.createElement("a");s.download=`qart-qr-${Date.now()}.svg`,s.href=n,s.click(),URL.revokeObjectURL(n)}catch(t){console.error("Failed to generate SVG:",t),alert(`Failed to generate SVG: ${t instanceof Error?t.message:"Unknown error"}`)}}resetAll(){var s,a,r,o;document.getElementById("qrData").value="https://example.com",document.getElementById("imageUpload").value="",document.getElementById("imageURL").value="",document.getElementById("imagePreview").classList.add("hidden"),this.resetSlider("posX","posXValue",0),this.resetSlider("posY","posYValue",0),this.resetSlider("scale","scaleValue",1,!0),this.resetSlider("threshold","thresholdValue",128),this.resetSlider("version","versionValue",5);const t=document.querySelector('input[name="ecLevel"][value="H"]');t.checked=!0,document.getElementById("fillColor").value="#000000",document.getElementById("backgroundColor").value="#FFFFFF",document.getElementById("randCheck").checked=!1,document.getElementById("ditherCheck").checked=!1,document.getElementById("onlyDataBitsCheck").checked=!1,this.currentImage=null,this.currentData="https://example.com",this.currentOptions={},document.getElementById("qrCanvas").classList.add("hidden"),document.getElementById("placeholder").classList.remove("hidden"),document.getElementById("stats").classList.add("hidden"),document.getElementById("scanInstructions").classList.add("hidden"),document.getElementById("downloadBtn").disabled=!0,document.getElementById("downloadSvgBtn").disabled=!0,this.fountainEncoder=void 0,(s=this.fountainDecoder)==null||s.reset(),this.fountainDecoder=void 0,this.stopFountainAnimation(),this.fountainFrames=void 0,this.fountainFrameIndex=0,this.isFountainPlaying=!1,this.fountainFillColor="#000000",this.fountainBackgroundColor="#ffffff";const e=document.getElementById("fountainEnabled");e&&(e.checked=!1);const n=document.getElementById("fountainEnabledInline");n&&(n.checked=!1),(a=document.getElementById("fountain-controls"))==null||a.classList.add("hidden"),(r=document.getElementById("scan-result"))==null||r.classList.add("hidden"),(o=document.getElementById("scan-progress"))==null||o.classList.add("hidden"),this.updateCapacityInfo(),this.updateModuleCount(5)}resetSlider(t,e,n,s=!1){const a=document.getElementById(t),r=document.getElementById(e);a.value=n.toString(),r.textContent=s?n.toFixed(1):n.toString()}adjustVersion(t){const e=document.getElementById("version"),n=parseInt(e.value),s=Math.max(1,Math.min(20,n+t));e.value=s.toString(),document.getElementById("versionValue").textContent=s.toString(),this.currentOptions.qrVersion=s,this.updateModuleCount(s),this.updateCapacityInfo()}updateModuleCount(t){const e=17+t*4;document.getElementById("moduleCount").textContent=e.toString()}updateCapacityInfo(){const t=parseInt(document.getElementById("version").value),e=document.querySelector('input[name="ecLevel"]:checked').value,n=document.getElementById("fountainEnabledInline"),s=this.generator.getDataCapacity(t,e),a=this.currentData.length,r=document.getElementById("capacityInfo");if(r)if(r.innerHTML="",n!=null&&n.checked){const o=a+6,c=this.calculateFragmentSize(t,e),l=this.calculateRedundancy(e),d=c>0?Math.ceil(o/c*l):0,f=document.createElement("i");f.className="fas fa-layer-group",f.style.color="#667eea",r.appendChild(f),r.appendChild(document.createTextNode(" ")),r.style.color="#667eea",r.appendChild(document.createTextNode(`${a} bytes will be split into ${d} frames`))}else{const o=document.createElement("i");o.className=a>s?"fas fa-exclamation-triangle":"fas fa-info-circle",o.style.color=a>s?"#f44336":"#667eea",r.appendChild(o),r.appendChild(document.createTextNode(" ")),a>s?(r.style.color="#f44336",r.appendChild(document.createTextNode(`Data too long! ${a}/${s} bytes`))):(r.style.color="#667eea",r.appendChild(document.createTextNode(`Capacity: ${s} bytes (using ${a} bytes)`)))}}updateFountainMode(){const t=document.getElementById("fountainEnabledInline"),e=document.getElementById("fountain-controls");t!=null&&t.checked?e==null||e.classList.remove("hidden"):(e==null||e.classList.add("hidden"),this.stopFountainAnimation()),this.updateCapacityInfo()}calculateFragmentSize(t,e){var a;const s=((a={1:{L:17,M:14,Q:11,H:7},2:{L:32,M:26,Q:20,H:14},3:{L:53,M:42,Q:32,H:24},4:{L:78,M:62,Q:46,H:34},5:{L:106,M:84,Q:60,H:44},6:{L:134,M:106,Q:74,H:58},7:{L:154,M:122,Q:86,H:64},8:{L:192,M:152,Q:108,H:84},9:{L:230,M:180,Q:130,H:98},10:{L:271,M:213,Q:151,H:119},11:{L:321,M:251,Q:177,H:137},12:{L:367,M:287,Q:203,H:155},13:{L:425,M:331,Q:241,H:177},14:{L:458,M:362,Q:258,H:194},15:{L:520,M:412,Q:292,H:220},16:{L:586,M:450,Q:322,H:250},17:{L:644,M:504,Q:364,H:280},18:{L:718,M:560,Q:394,H:310},19:{L:792,M:624,Q:442,H:338},20:{L:858,M:666,Q:482,H:382}}[t])==null?void 0:a[e])||50;return Math.max(20,s-20)}calculateRedundancy(t){return{L:1.2,M:1.5,Q:2,H:2.5}[t]||1.5}handleKeyboard(t){if(this.currentMode==="scan")return;if(t.ctrlKey&&t.key==="Enter"){t.preventDefault(),this.generateQR();return}if(t.ctrlKey&&t.key==="s"){t.preventDefault(),this.downloadQR();return}const e=1;t.key==="ArrowLeft"?(t.preventDefault(),this.adjustPosition(-e,0)):t.key==="ArrowRight"?(t.preventDefault(),this.adjustPosition(e,0)):t.key==="ArrowUp"?(t.preventDefault(),this.adjustPosition(0,-e)):t.key==="ArrowDown"&&(t.preventDefault(),this.adjustPosition(0,e)),t.key==="+"||t.key==="="?(t.preventDefault(),this.adjustScale(1.1)):(t.key==="-"||t.key==="_")&&(t.preventDefault(),this.adjustScale(.9)),t.key==="["?(t.preventDefault(),this.adjustVersion(-1)):t.key==="]"&&(t.preventDefault(),this.adjustVersion(1))}adjustPosition(t,e){const n=document.getElementById("posX"),s=document.getElementById("posY"),a=Math.max(-50,Math.min(50,parseInt(n.value)+t)),r=Math.max(-50,Math.min(50,parseInt(s.value)+e));n.value=a.toString(),s.value=r.toString(),document.getElementById("posXValue").textContent=a.toString(),document.getElementById("posYValue").textContent=r.toString(),this.currentOptions.imageTransform={...this.currentOptions.imageTransform||{x:0,y:0,scale:1},x:a,y:r}}adjustScale(t){const e=document.getElementById("scale"),n=parseFloat(e.value),s=Math.max(.1,Math.min(3,n*t));e.value=s.toString(),document.getElementById("scaleValue").textContent=s.toFixed(1),this.currentOptions.imageTransform={...this.currentOptions.imageTransform||{x:0,y:0,scale:1},scale:s}}initializeModeTabs(){document.querySelectorAll(".mode-tab").forEach(e=>{e.addEventListener("click",n=>{const s=n.currentTarget.dataset.mode;this.switchMode(s)}),e.addEventListener("keydown",n=>{if(n.key==="ArrowLeft"||n.key==="ArrowRight"){n.preventDefault();const a=n.currentTarget.dataset.mode==="generate"?"scan":"generate";this.switchMode(a);const r=document.querySelector(`.mode-tab[data-mode="${a}"]`);r==null||r.focus()}})})}switchMode(t){this.currentMode=t,document.querySelectorAll(".mode-tab").forEach(e=>{const n=e.dataset.mode===t;e.classList.toggle("active",n),e.setAttribute("aria-selected",n.toString()),e.setAttribute("tabindex",n?"0":"-1")}),document.querySelectorAll(".mode-content").forEach(e=>{e.classList.toggle("active",e.id===`${t}-mode`)}),t==="scan"?this.qrScanner||this.initializeScanner():this.stopScanner()}async initializeScanner(){var e,n,s,a;const t=document.getElementById("scanner-video");t&&(this.qrScanner||(this.qrScanner=new ft(t,{maxScansPerSecond:10})),this.currentCameraIndex=0,this.scannerInitialized||((e=document.getElementById("startScanBtn"))==null||e.addEventListener("click",()=>this.startScanning()),(n=document.getElementById("stopScanBtn"))==null||n.addEventListener("click",()=>this.stopScanning()),(s=document.getElementById("switchCameraBtn"))==null||s.addEventListener("click",()=>this.switchCamera()),(a=document.getElementById("toggleFlashBtn"))==null||a.addEventListener("click",()=>this.toggleFlash()),this.scannerInitialized=!0))}async startScanning(){var n;if(!this.qrScanner)return;const t=document.getElementById("startScanBtn"),e=document.getElementById("stopScanBtn");try{t&&(t.disabled=!0),this.qrScanner.onScan(s=>this.handleScanResult(s)),await this.qrScanner.start(),t&&t.classList.add("hidden"),e&&(e.classList.remove("hidden"),e.disabled=!1),(n=document.getElementById("scan-progress"))==null||n.classList.remove("hidden")}catch(s){console.error("Failed to start scanner:",s),alert("Failed to start camera. Please ensure camera permissions are granted."),t&&(t.disabled=!1)}}stopScanning(){var n;const t=document.getElementById("startScanBtn"),e=document.getElementById("stopScanBtn");e&&(e.disabled=!0),(n=this.qrScanner)==null||n.stop(),t&&(t.classList.remove("hidden"),t.disabled=!1),e&&e.classList.add("hidden")}stopScanner(){var t;(t=this.qrScanner)==null||t.stop()}destroyScanner(){var t;(t=this.qrScanner)==null||t.destroy(),this.qrScanner=void 0,this.scannerInitialized=!1}async switchCamera(){if(!this.qrScanner)return;const t=await ft.listCameras();t.length>1&&(this.currentCameraIndex=(this.currentCameraIndex+1)%t.length,await this.qrScanner.setCamera(t[this.currentCameraIndex].id))}async toggleFlash(){this.qrScanner&&await this.qrScanner.toggleFlash()}handleScanResult(t){t.data.startsWith("ur:")?this.handleFountainFragment(t.data):(this.displayScanResult(t.data),this.displaySingleFrameResult())}handleFountainFragment(t){this.fountainDecoder||(this.fountainDecoder=new Jt({onProgress:e=>this.updateScanProgress(e),onComplete:e=>this.displayScanResult(e),onFrame:e=>this.showFrameConfirmation(e)})),this.fountainDecoder.receiveFragment(t)}updateScanProgress(t){const e=document.getElementById("scan-progress"),n=document.getElementById("progress-fill"),s=document.getElementById("progress-label"),a=document.getElementById("scanned-frames"),r=document.getElementById("estimated-frames");if(n&&(n.style.width=`${t.percentage}%`),e&&e.setAttribute("aria-valuenow",t.percentage.toString()),s&&(t.isComplete?s.textContent="Complete!":t.receivedFragments===1&&t.estimatedTotalFragments===1?s.textContent="Single frame detected":s.textContent="Scanning..."),a&&(a.textContent=t.receivedFragments.toString()),r){const o=t.totalFrameCount??t.estimatedTotalFragments;r.textContent=o.toString()}t.isComplete&&this.stopScanning()}showFrameConfirmation(t){const e=document.getElementById("scanner-overlay");e==null||e.classList.add("frame-captured"),setTimeout(()=>e==null?void 0:e.classList.remove("frame-captured"),200),this.playBeep()}playBeep(){try{this.audioContext||(this.audioContext=new(window.AudioContext||window.webkitAudioContext));const t=this.audioContext.createOscillator(),e=this.audioContext.createGain();t.connect(e),e.connect(this.audioContext.destination),t.frequency.value=800,t.type="sine",e.gain.setValueAtTime(.3,this.audioContext.currentTime),e.gain.exponentialRampToValueAtTime(.01,this.audioContext.currentTime+.1),t.start(this.audioContext.currentTime),t.stop(this.audioContext.currentTime+.1)}catch(t){console.warn("Audio feedback not available:",t)}}displayScanResult(t){const e=document.getElementById("scan-result"),n=document.getElementById("result-data");e&&n&&(n.value=t,e.classList.remove("hidden"))}displaySingleFrameResult(){const t=document.getElementById("scanned-frames"),e=document.getElementById("estimated-frames"),n=document.getElementById("progress-fill"),s=document.getElementById("progress-label"),a=document.getElementById("scan-progress");t&&(t.textContent="1"),e&&(e.textContent="1"),n&&(n.style.width="100%"),s&&(s.textContent="Single frame detected"),a&&(a.setAttribute("aria-valuenow","100"),a.classList.remove("hidden")),this.stopScanning()}async generateFountainQR(){const t=document.getElementById("generateBtn");try{t.classList.add("loading"),t.disabled=!0;const e=parseInt(document.getElementById("version").value),n=document.querySelector('input[name="ecLevel"]:checked').value,s=document.getElementById("fillColor").value,a=document.getElementById("backgroundColor").value;this.fountainEncoder=new Kt({qrVersion:e,errorCorrectionLevel:n});const r=await this.fountainEncoder.generateFrames(this.currentData,e,n),o=document.getElementById("qrCanvas"),c=document.getElementById("placeholder");c&&c.classList.add("hidden"),o&&o.classList.remove("hidden"),this.startFountainAnimation(r,s,a);const l=document.getElementById("scanInstructions");l&&(l.innerHTML=`
          <h3><i class="fas fa-film"></i> Fountain QR Generated!</h3>
          <p>Generated ${r.length} frames. Use another device to scan the animated sequence.</p>
        `,l.classList.remove("hidden"))}catch(e){console.error("Failed to generate fountain QR:",e),alert(`Failed to generate fountain QR: ${e instanceof Error?e.message:"Unknown error"}`)}finally{t.classList.remove("loading"),t.disabled=!1}}startFountainAnimation(t,e="#000000",n="#ffffff"){const s=document.getElementById("qrCanvas"),a=s.getContext("2d"),r=document.getElementById("current-frame"),o=document.getElementById("total-frames");if(!a||t.length===0)return;s.width=400,s.height=400,o&&(o.textContent=t.length.toString()),this.fountainFrames=t,this.fountainFrameIndex=0,this.isFountainPlaying=!0,this.fountainFillColor=e,this.fountainBackgroundColor=n;const c=2;this.stopFountainAnimation(),this.isFountainPlaying=!0,this.animationInterval=window.setInterval(async()=>{!this.isFountainPlaying||!this.fountainFrames||(await this.renderFountainFrame(),r&&(r.textContent=(this.fountainFrameIndex+1).toString()),this.fountainFrameIndex=(this.fountainFrameIndex+1)%this.fountainFrames.length)},1e3/c);const l=document.getElementById("playPauseBtn");l&&(l.innerHTML='<i class="fas fa-pause"></i> Pause')}async renderFountainFrame(){const t=document.getElementById("qrCanvas"),e=t.getContext("2d");if(!e||!this.fountainFrames)return;const n=this.fountainFrames[this.fountainFrameIndex];try{await H.toCanvas(t,n,{width:t.width,margin:2,color:{dark:this.fountainFillColor||"#000000",light:this.fountainBackgroundColor||"#ffffff"}})}catch(s){console.error("Failed to generate QR code:",s),e.fillStyle=this.fountainBackgroundColor||"#ffffff",e.fillRect(0,0,t.width,t.height),e.fillStyle="#ff0000",e.font="12px sans-serif",e.fillText("QR generation failed",10,20)}}stopFountainAnimation(){this.animationInterval&&(clearInterval(this.animationInterval),this.animationInterval=void 0),this.isFountainPlaying=!1}toggleFountainAnimation(){this.isFountainPlaying=!this.isFountainPlaying;const t=document.getElementById("playPauseBtn");if(t)if(this.isFountainPlaying){t.innerHTML='<i class="fas fa-pause"></i> Pause';const e=2;this.animationInterval=window.setInterval(async()=>{if(!this.isFountainPlaying||!this.fountainFrames)return;await this.renderFountainFrame();const n=document.getElementById("current-frame");n&&(n.textContent=(this.fountainFrameIndex+1).toString()),this.fountainFrameIndex=(this.fountainFrameIndex+1)%this.fountainFrames.length},1e3/e)}else t.innerHTML='<i class="fas fa-play"></i> Play',this.stopFountainAnimation()}restartFountainAnimation(){this.fountainFrames&&(this.fountainFrameIndex=0,this.isFountainPlaying=!0,this.startFountainAnimation(this.fountainFrames))}async copyScanResult(){const t=document.getElementById("result-data");if(!t)return;const e=document.getElementById("copyResultBtn"),n=(e==null?void 0:e.innerHTML)||"";try{navigator.clipboard&&navigator.clipboard.writeText?await navigator.clipboard.writeText(t.value):(t.select(),t.setSelectionRange(0,99999),document.execCommand("copy")),e&&(e.innerHTML='<i class="fas fa-check"></i> Copied!',setTimeout(()=>{e.innerHTML=n},2e3))}catch(s){console.error("Failed to copy:",s),alert("Failed to copy to clipboard")}}}document.addEventListener("DOMContentLoaded",()=>{new Ne});
