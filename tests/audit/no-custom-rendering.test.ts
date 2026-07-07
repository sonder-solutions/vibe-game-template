import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Audit test to ensure all games use standard engine rendering (WebGPU/WebGL)
 * and do not implement custom rendering logic.
 *
 * This test:
 * 1. Scans all game directories (excluding /demo for legacy purposes)
 * 2. Checks that games use EngineFactory to create engines
 * 3. Verifies no direct canvas context manipulation for rendering
 * 4. Ensures both WebGPU and WebGL fallback engines are utilized
 */

// Patterns that indicate custom rendering (banned)
// Only flag these if they appear in render methods or game loop contexts
const CUSTOM_RENDERING_PATTERNS = [
  /render\s*\(\s*\)\s*:\s*void\s*{[\s\S]*?ctx\.fillRect\(/,
  /render\s*\(\s*\)\s*:\s*void\s*{[\s\S]*?ctx\.drawImage\(/,
  /render\s*\(\s*\)\s*:\s*void\s*{[\s\S]*?ctx\.clearRect\(/,
  /render\s*\(\s*\)\s*:\s*void\s*{[\s\S]*?getContext\(['"]2d['"]\)/,
  /private\s+render\s*\(\s*\)[\s\S]*?ctx\./,
];

// Patterns that indicate proper engine usage (required)
const ENGINE_USAGE_PATTERNS = [
  /EngineFactory\.createEngine/,
  /engine\.render\(\)/,
  /engine\.update\(/,
  /engine\.addSprite\(/,
];

// Directories to audit (game directories)
const GAME_DIRECTORIES = ['flower'];

// Directories to skip (legacy demos, engine code itself)
const SKIP_DIRECTORIES = ['demo', 'src', 'node_modules', 'dist', 'assets', 'scripts', 'tests'];

function findGameFiles(dir: string): string[] {
  const files: string[] = [];

  function traverse(currentDir: string) {
    const entries = readdirSync(currentDir);

    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        if (!SKIP_DIRECTORIES.includes(entry)) {
          traverse(fullPath);
        }
      } else if (entry.endsWith('.ts') || entry.endsWith('.js')) {
        files.push(fullPath);
      }
    }
  }

  if (readdirSync(dir).includes('game.ts') || readdirSync(dir).includes('game.js')) {
    traverse(dir);
  }

  return files;
}

function checkFileForCustomRendering(filePath: string): { hasCustom: boolean; patterns: string[] } {
  const content = readFileSync(filePath, 'utf-8');
  const detectedPatterns: string[] = [];

  for (const pattern of CUSTOM_RENDERING_PATTERNS) {
    if (pattern.test(content)) {
      detectedPatterns.push(pattern.source);
    }
  }

  return {
    hasCustom: detectedPatterns.length > 0,
    patterns: detectedPatterns,
  };
}

function checkFileForEngineUsage(filePath: string): { hasEngine: boolean; patterns: string[] } {
  const content = readFileSync(filePath, 'utf-8');
  const detectedPatterns: string[] = [];

  for (const pattern of ENGINE_USAGE_PATTERNS) {
    if (pattern.test(content)) {
      detectedPatterns.push(pattern.source);
    }
  }

  return {
    hasEngine: detectedPatterns.length > 0,
    patterns: detectedPatterns,
  };
}

describe('Rendering Audit - No Custom Rendering', () => {
  it('should not have custom rendering in game files', () => {
    const violations: { file: string; patterns: string[] }[] = [];

    for (const gameDir of GAME_DIRECTORIES) {
      const gamePath = join(process.cwd(), gameDir);

      if (!statSync(gamePath).isDirectory()) {
        continue;
      }

      const files = findGameFiles(gamePath);

      for (const file of files) {
        const { hasCustom, patterns } = checkFileForCustomRendering(file);

        if (hasCustom) {
          violations.push({
            file: file.replace(process.cwd(), ''),
            patterns,
          });
        }
      }
    }

    if (violations.length > 0) {
      const message = violations
        .map(v => `  ${v.file}: detected ${v.patterns.join(', ')}`)
        .join('\n');

      throw new Error(
        `Custom rendering detected in game files. All games must use engine rendering.\n${message}`
      );
    }
  });

  it('should use EngineFactory and engine rendering', () => {
    const violations: string[] = [];

    for (const gameDir of GAME_DIRECTORIES) {
      const gamePath = join(process.cwd(), gameDir);

      if (!statSync(gamePath).isDirectory()) {
        continue;
      }

      const files = findGameFiles(gamePath);
      const gameFiles = files.filter(f => f.includes('game.ts') || f.includes('game.js'));

      for (const file of gameFiles) {
        const { hasEngine } = checkFileForEngineUsage(file);

        if (!hasEngine) {
          violations.push(file.replace(process.cwd(), ''));
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Games must use EngineFactory and engine rendering. Violations:\n${violations.map(v => `  ${v}`).join('\n')}`
      );
    }
  });

  it('should support both WebGPU and WebGL engines', () => {
    // This test verifies that the engine system supports both rendering backends
    // The actual engine selection happens in EngineFactory based on browser support

    const engineFactoryPath = join(process.cwd(), 'src/core/engine/EngineFactory.ts');
    const content = readFileSync(engineFactoryPath, 'utf-8');

    expect(content).toMatch(/WebGPUEngine/);
    expect(content).toMatch(/FallbackEngine/);
    expect(content).toMatch(/navigator\.gpu/);
  });
});
