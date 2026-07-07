import { IEngine } from './IEngine.js';
import { Sprite, GameState, EngineConfig } from './types.js';
import type { ISecurityService } from '../../services/interfaces/ISecurityService.js';

const shaderCode = `
struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
  @location(1) uv: vec2<f32>,
}

@group(0) @binding(0) var tex: texture_2d<f32>;
@group(0) @binding(1) var texSampler: sampler;

@vertex
fn vs_main(@location(0) position: vec2<f32>, @location(1) color: vec4<f32>, @location(2) uv: vec2<f32>) -> VertexOutput {
  var output: VertexOutput;
  output.position = vec4<f32>(position, 0.0, 1.0);
  output.color = color;
  output.uv = uv;
  return output;
}

@fragment
fn fs_main(@location(0) color: vec4<f32>, @location(1) uv: vec2<f32>) -> @location(0) vec4<f32> {
  var texColor = textureSample(tex, texSampler, uv);
  // Apply vertex color tint
  texColor = texColor * color;
  // Premultiply alpha for correct blending
  texColor.r *= texColor.a;
  texColor.g *= texColor.a;
  texColor.b *= texColor.a;
  return texColor;
}
`;

export class WebGPUEngine implements IEngine {
  #canvas: HTMLCanvasElement | null = null;
  #device: GPUDevice | null = null;
  #context: GPUCanvasContext | null = null;
  #pipeline: GPURenderPipeline | null = null;
  #vertexBuffer: GPUBuffer | null = null;
  #vertexBufferSize: number = 0;
  #indexBuffer: GPUBuffer | null = null;
  #sprites: Map<string, Sprite> = new Map();
  #state: GameState = {
    score: 0,
    health: 100,
    time: 0,
    lives: 3
  };
  #textureCache: Map<HTMLImageElement, { texture: GPUTexture; bindGroup: GPUBindGroup }> = new Map();
  #sampler: GPUSampler | null = null;
  #bindGroupLayout: GPUBindGroupLayout | null = null;
  #defaultTexture: GPUTexture | null = null;
  #defaultBindGroup: GPUBindGroup | null = null;
  #backgroundColor: { r: number; g: number; b: number; a: number } = { r: 0.976, g: 0.953, b: 0.91, a: 1 }; // Default cream color
  #securityService?: ISecurityService;

  constructor(securityService?: ISecurityService) {
    this.#securityService = securityService;
  }

  async initialize(config: EngineConfig): Promise<void> {
    this.#canvas = config.canvas;

    // Store background color from config
    if (config.backgroundColor) {
      this.#backgroundColor = config.backgroundColor;
    }

    if (this.#securityService) {
      try {
        await this.#securityService.initialize();
        this.#securityService.resetTime();
      } catch {
        // Security service may already be initialized or unavailable
      }
    }

    if (!navigator.gpu) {
      throw new Error('WebGPU not supported');
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error('Failed to get GPU adapter');
    }

    this.#device = await adapter.requestDevice();
    this.#context = this.#canvas.getContext('webgpu') as GPUCanvasContext;

    if (!this.#context) {
      throw new Error('Failed to get WebGPU context');
    }

    const format = navigator.gpu.getPreferredCanvasFormat();
    this.#context.configure({
      device: this.#device,
      format: format,
      alphaMode: 'premultiplied'
    });

    // Create bind group layout for textures
    this.#bindGroupLayout = this.#device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {}
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {}
        }
      ]
    });

    // Create sampler
    this.#sampler = this.#device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear'
    });

    // Create render pipeline
    const shaderModule = this.#device.createShaderModule({
      code: shaderCode
    });

    const pipelineLayout = this.#device.createPipelineLayout({
      bindGroupLayouts: [this.#bindGroupLayout]
    });

    this.#pipeline = this.#device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
        buffers: [
          {
            arrayStride: 32, // 2 floats for position (8 bytes) + 4 floats for color (16 bytes) + 2 floats for UV (8 bytes)
            attributes: [
              {
                // position
                shaderLocation: 0,
                offset: 0,
                format: 'float32x2'
              },
              {
                // color
                shaderLocation: 1,
                offset: 8,
                format: 'float32x4'
              },
              {
                // uv
                shaderLocation: 2,
                offset: 24,
                format: 'float32x2'
              }
            ]
          }
        ]
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{
          format,
          blend: {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add'
            },
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add'
            }
          }
        }]
      },
      primitive: {
        topology: 'triangle-list'
      }
    });

    // Create index buffer for a unit quad (will be transformed per sprite)
    const quadIndices = new Uint16Array([
      0, 1, 2,  // first triangle
      0, 2, 3   // second triangle
    ]);

    this.#indexBuffer = this.#device.createBuffer({
      size: quadIndices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    new Uint16Array(this.#indexBuffer.getMappedRange()).set(quadIndices);
    this.#indexBuffer.unmap();

    // Create default 1x1 white texture for sprites without sprite sheets
    this.#defaultTexture = this.#device.createTexture({
      size: { width: 1, height: 1 },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    });

    // Write white pixel to default texture
    this.#device.queue.writeTexture(
      { texture: this.#defaultTexture },
      new Uint8Array([255, 255, 255, 255]), // White pixel
      { bytesPerRow: 4 },
      { width: 1, height: 1 }
    );

    // Create default bind group
    this.#defaultBindGroup = this.#device.createBindGroup({
      layout: this.#bindGroupLayout,
      entries: [
        { binding: 0, resource: this.#defaultTexture.createView() },
        { binding: 1, resource: this.#sampler }
      ]
    });
  }

  update(deltaTime: number): void {
    if (this.#securityService) {
      this.#securityService.incrementTime();
      this.#state.time = Number(this.#securityService.getTime());
    }

    for (const sprite of this.#sprites.values()) {
      sprite.position.x += sprite.velocity.x * deltaTime;
      sprite.position.y += sprite.velocity.y * deltaTime;
    }
  }

  render(): void {
    if (!this.#device || !this.#context || !this.#canvas || !this.#pipeline || !this.#indexBuffer || !this.#sampler || !this.#bindGroupLayout) return;

    const commandEncoder = this.#device.createCommandEncoder();
    const textureView = this.#context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: this.#backgroundColor,
        loadOp: 'clear',
        storeOp: 'store'
      }]
    });

    renderPass.setPipeline(this.#pipeline);

    const canvasWidth = this.#canvas.width;
    const canvasHeight = this.#canvas.height;

    // Collect all sprite vertices
    const allVertices: number[] = [];

    for (const sprite of this.#sprites.values()) {
      const r = sprite.color ? parseInt(sprite.color.slice(1, 3), 16) / 255 : 1;
      const g = sprite.color ? parseInt(sprite.color.slice(3, 5), 16) / 255 : 1;
      const b = sprite.color ? parseInt(sprite.color.slice(5, 7), 16) / 255 : 1;

      // Calculate center position in clip space
      const centerX = ((sprite.position.x + sprite.width / 2) / canvasWidth) * 2 - 1;
      const centerY = -(((sprite.position.y + sprite.height / 2) / canvasHeight) * 2 - 1);

      // Define corners in normalized local space (-0.5 to 0.5) relative to pivot
      let corners = [
        { x: -0.5, y: -0.5 },  // top-left
        { x: 0.5, y: -0.5 },   // top-right
        { x: 0.5, y: 0.5 },    // bottom-right
        { x: -0.5, y: 0.5 }    // bottom-left
      ];

      // 1. Apply rotation first (in normalized local space)
      if (sprite.rotation) {
        const cos = Math.cos(-sprite.rotation);
        const sin = Math.sin(-sprite.rotation);
        corners = corners.map(corner => ({
          x: corner.x * cos - corner.y * sin,
          y: corner.x * sin + corner.y * cos
        }));
      }

      // 2. Scale uniformly to sprite size and convert to clip space
      // Use uniform scale factor for both X and Y to prevent stretching
      const scale = 2 / Math.max(canvasWidth, canvasHeight);
      corners = corners.map(corner => ({
        x: corner.x * sprite.width * scale,
        y: corner.y * sprite.height * scale
      }));

      // Define UV coordinates (flip both U and V to correct orientation)
      let uvs = [
        { u: 1, v: 0 },  // top-left
        { u: 0, v: 0 },  // top-right
        { u: 0, v: 1 },  // bottom-right
        { u: 1, v: 1 }   // bottom-left
      ];

      // If sprite has sprite sheet, calculate UV coordinates from frame
      if (sprite.spriteSheet && sprite.spriteFrame) {
        const { x, y, w, h } = sprite.spriteFrame;
        const sheetWidth = sprite.spriteSheet.width;
        const sheetHeight = sprite.spriteSheet.height;

        uvs = [
          { u: (x + w) / sheetWidth, v: (y + h) / sheetHeight },
          { u: x / sheetWidth, v: (y + h) / sheetHeight },
          { u: x / sheetWidth, v: y / sheetHeight },
          { u: (x + w) / sheetWidth, v: y / sheetHeight }
        ];

        // Ensure texture is created
        if (!this.#textureCache.has(sprite.spriteSheet)) {
          this.#createTexture(sprite.spriteSheet);
        }
      }

      // Transform corners to absolute positions and add to vertices
      for (let i = 0; i < 4; i++) {
        allVertices.push(
          centerX + corners[i].x, centerY + corners[i].y,
          r, g, b, 1,
          uvs[i].u, uvs[i].v
        );
      }
    }

    if (allVertices.length === 0) {
      renderPass.end();
      this.#device.queue.submit([commandEncoder.finish()]);
      return;
    }

    const vertexData = new Float32Array(allVertices);
    const requiredSize = vertexData.byteLength;

    // Create or resize vertex buffer if needed
    if (!this.#vertexBuffer || this.#vertexBufferSize < requiredSize) {
      this.#vertexBuffer?.destroy();
      this.#vertexBuffer = this.#device.createBuffer({
        size: requiredSize,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
      this.#vertexBufferSize = requiredSize;
    }

    this.#device.queue.writeBuffer(this.#vertexBuffer, 0, vertexData);

    renderPass.setVertexBuffer(0, this.#vertexBuffer);
    renderPass.setIndexBuffer(this.#indexBuffer, 'uint16');

    const numSprites = allVertices.length / 32;
    for (let i = 0; i < numSprites; i++) {
      // Get the sprite for this draw call
      const sprite = Array.from(this.#sprites.values())[i];

      // Bind texture - use sprite sheet texture if available, otherwise use default
      if (sprite?.spriteSheet && this.#textureCache.has(sprite.spriteSheet)) {
        const { bindGroup } = this.#textureCache.get(sprite.spriteSheet)!;
        renderPass.setBindGroup(0, bindGroup);
      } else if (this.#defaultBindGroup) {
        renderPass.setBindGroup(0, this.#defaultBindGroup);
      }

      renderPass.drawIndexed(6, 1, 0, i * 4);
    }

    renderPass.end();

    this.#device.queue.submit([commandEncoder.finish()]);
  }

  #createTexture(image: HTMLImageElement): void {
    if (!this.#device) return;

    const texture = this.#device.createTexture({
      size: { width: image.width, height: image.height },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
    });

    this.#device.queue.copyExternalImageToTexture(
      { source: image },
      { texture: texture },
      { width: image.width, height: image.height }
    );

    const bindGroup = this.#device.createBindGroup({
      layout: this.#bindGroupLayout!,
      entries: [
        { binding: 0, resource: texture.createView() },
        { binding: 1, resource: this.#sampler! }
      ]
    });

    this.#textureCache.set(image, { texture, bindGroup });
  }

  addSprite(sprite: Sprite): void {
    this.#sprites.set(sprite.id, sprite);
  }

  getSprite(id: string): Sprite | undefined {
    return this.#sprites.get(id);
  }

  getSpriteAtPosition(x: number, y: number): Sprite | undefined {
    for (const sprite of this.#sprites.values()) {
      // Simple AABB check (can be enhanced for rotated sprites)
      if (x >= sprite.position.x &&
          x <= sprite.position.x + sprite.width &&
          y >= sprite.position.y &&
          y <= sprite.position.y + sprite.height) {
        return sprite;
      }
    }
    return undefined;
  }

  removeSprite(id: string): void {
    this.#sprites.delete(id);
  }

  getState(): GameState {
    return { ...this.#state };
  }

  setState(state: Partial<GameState>): void {
    this.#state = { ...this.#state, ...state };
  }

  destroy(): void {
    this.#sprites.clear();
    this.#vertexBuffer?.destroy();
    this.#indexBuffer?.destroy();
    this.#device?.destroy();
    this.#device = null;
    this.#context = null;
    this.#canvas = null;
    this.#pipeline = null;
    this.#vertexBuffer = null;
    this.#vertexBufferSize = 0;
    this.#indexBuffer = null;
  }

  getCanvas(): HTMLCanvasElement {
    if (!this.#canvas) {
      throw new Error('Canvas not initialized');
    }
    return this.#canvas;
  }
}
