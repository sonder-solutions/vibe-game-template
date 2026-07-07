import * as ts from 'typescript';
import { readFileSync, existsSync } from 'fs';
import { glob } from 'glob';
import { join, dirname, resolve, relative } from 'path';

export class AssetAnalyzer {
  private verbose: boolean;

  constructor(verbose: boolean = false) {
    this.verbose = verbose;
  }

  /**
   * Layer 1: Static Analysis - Find directly referenced assets
   */
  async findStaticAssets(sourceDirs: string[]): Promise<Set<string>> {
    const assets = new Set<string>();

    const patterns = [
      // import img from './path.png'
      /import\s+[^'"]*['"]([^'"]*\.png)['"]/g,
      // String literals: './assets/flower.png'
      /['"]([^'"]*\.png)['"]/g,
      // Template literals without variables: `./assets/flower.png`
      /`([^`$]*\.png)`/g,
      // new Image() or loadImage() calls
      /(?:new\s+Image|loadImage)\s*\(\s*['"]([^'"]*\.png)['"]/g,
    ];

    for (const dir of sourceDirs) {
      const files = await glob(join(dir, '**/*.{ts,tsx,js,jsx}'));

      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const dirPath = dirname(file);

        for (const pattern of patterns) {
          let match;
          pattern.lastIndex = 0;

          while ((match = pattern.exec(content)) !== null) {
            let assetPath = match[1];

            // Skip URLs and data URIs
            if (assetPath.startsWith('http') || assetPath.startsWith('data:')) {
              continue;
            }

            // Skip template literals with variables
            if (assetPath.includes('${')) {
              continue;
            }

            // Resolve relative paths
            if (assetPath.startsWith('./') || assetPath.startsWith('../')) {
              assetPath = join(dirPath, assetPath);
            }

            // Normalize path
            assetPath = assetPath.replace(/\\/g, '/');

            // Check if file exists
            const fullPath = resolve(process.cwd(), assetPath);
            if (existsSync(fullPath)) {
              assets.add(assetPath);
              if (this.verbose) {
                console.log(`  ✓ Static: ${assetPath}`);
              }
            }
          }
        }
      }
    }

    return assets;
  }

  /**
   * Layer 2: TypeScript Type Analysis - Find dynamically constructed assets
   */
  async findTypedAssets(sourceDirs: string[]): Promise<Set<string>> {
    const assets = new Set<string>();

    for (const dir of sourceDirs) {
      const files = await glob(join(dir, '**/*.{ts,tsx}'));

      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const dirPath = dirname(file);

        const sourceFile = ts.createSourceFile(
          file,
          content,
          ts.ScriptTarget.Latest,
          true
        );

        // Extract type information
        const types = this.extractTypes(sourceFile);

        // Find template literals with type variables
        this.findTemplateLiteralsWithTypes(sourceFile, types, dirPath, assets);
      }
    }

    return assets;
  }

  /**
   * Extract type definitions from source file
   */
  private extractTypes(sourceFile: ts.SourceFile): Map<string, string[]> {
    const types = new Map<string, string[]>();

    const visit = (node: ts.Node) => {
      // Handle type aliases: type Flower = 'rose' | 'tulip'
      if (ts.isTypeAliasDeclaration(node)) {
        const typeName = node.name.text;
        const values = this.extractUnionTypeValues(node.type);
        if (values.length > 0) {
          types.set(typeName, values);
        }
      }

      // Handle const assertions: const FLOWERS = ['rose', 'tulip'] as const
      if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (decl.name && ts.isIdentifier(decl.name) && decl.initializer) {
            const varName = decl.name.text;
            const values = this.extractConstArrayValues(decl.initializer);
            if (values.length > 0) {
              types.set(varName, values);
            }
          }
        }
      }

      // Handle enums: enum Flower { Rose = 'rose', Tulip = 'tulip' }
      if (ts.isEnumDeclaration(node)) {
        const enumName = node.name.text;
        const values = this.extractEnumValues(node);
        if (values.length > 0) {
          types.set(enumName, values);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return types;
  }

  /**
   * Extract values from union type: 'rose' | 'tulip' | 'lily'
   */
  private extractUnionTypeValues(typeNode: ts.TypeNode): string[] {
    const values: string[] = [];

    if (ts.isUnionTypeNode(typeNode)) {
      for (const type of typeNode.types) {
        if (ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal)) {
          values.push(type.literal.text);
        }
      }
    }

    return values;
  }

  /**
   * Extract values from const array: ['rose', 'tulip'] as const
   */
  private extractConstArrayValues(initializer: ts.Expression): string[] {
    const values: string[] = [];

    if (ts.isArrayLiteralExpression(initializer)) {
      for (const element of initializer.elements) {
        if (ts.isStringLiteral(element)) {
          values.push(element.text);
        }
      }
    }

    return values;
  }

  /**
   * Extract values from enum
   */
  private extractEnumValues(enumDecl: ts.EnumDeclaration): string[] {
    const values: string[] = [];

    for (const member of enumDecl.members) {
      if (member.initializer && ts.isStringLiteral(member.initializer)) {
        values.push(member.initializer.text);
      }
    }

    return values;
  }

  /**
   * Find template literals that use typed variables
   */
  private findTemplateLiteralsWithTypes(
    sourceFile: ts.SourceFile,
    types: Map<string, string[]>,
    dirPath: string,
    assets: Set<string>
  ): void {
    // First, build a map of parameter names to their types
    const paramTypes = new Map<string, string>();

    const visitForParams = (node: ts.Node) => {
      if (ts.isParameter(node) && node.name && ts.isIdentifier(node.name) && node.type) {
        const paramName = node.name.text;
        let typeName = '';

        if (ts.isTypeReferenceNode(node.type) && ts.isIdentifier(node.type.typeName)) {
          typeName = node.type.typeName.text;
        }

        if (typeName && types.has(typeName)) {
          paramTypes.set(paramName, typeName);
        }
      }

      ts.forEachChild(node, visitForParams);
    };

    visitForParams(sourceFile);

    const visit = (node: ts.Node) => {
      if (ts.isTemplateLiteral(node) || ts.isTemplateExpression(node)) {
        const template = this.getTemplateText(node);

        // Check if template contains .png
        if (template && template.includes('.png')) {
          // Find all type references in the template (including parameter names)
          const typeRefs = this.findTypeReferencesInTemplate(node, types, paramTypes);

          // Generate all possible combinations
          const paths = this.generatePathsFromTemplate(template, typeRefs);

          for (const path of paths) {
            let assetPath = path;

            // Resolve relative paths - try file-relative first, then project-root-relative
            if (assetPath.startsWith('./') || assetPath.startsWith('../')) {
              const fileRelativePath = join(dirPath, assetPath);
              const fullPath = resolve(process.cwd(), fileRelativePath);

              if (existsSync(fullPath)) {
                assetPath = fileRelativePath.replace(/\\/g, '/');
              } else {
                // Try project-root-relative
                assetPath = assetPath.replace(/^\.\//, '');
              }
            }

            // Normalize path
            assetPath = assetPath.replace(/\\/g, '/');

            // Check if file exists
            const fullPath = resolve(process.cwd(), assetPath);
            if (existsSync(fullPath)) {
              assets.add(assetPath);
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  /**
   * Get template text from node
   */
  private getTemplateText(node: ts.Node): string {
    // Check TemplateExpression first (more specific)
    if (ts.isTemplateExpression(node)) {
      // For template expressions like `./path/${var}.png`
      // head contains the text before the first expression
      // Each span has an expression and a literal (the text after the expression)
      let result = node.head?.text || '';
      for (const span of node.templateSpans || []) {
        // Add a placeholder for the expression (we'll replace it later)
        const exprText = ts.isIdentifier(span.expression) ? span.expression.text : 'expr';
        result += '${' + exprText + '}';
        result += span.literal?.text || '';
      }
      return result;
    }
    // Then check for NoSubstitutionTemplateLiteral (template with no expressions)
    if (ts.isStringLiteral(node) || (node as any).text !== undefined) {
      return (node as any).text;
    }
    return '';
  }
  /**
   * Find type references in template literal
   */
  private findTypeReferencesInTemplate(
    node: ts.Node,
    types: Map<string, string[]>,
    paramTypes: Map<string, string>
  ): Map<string, string[]> {
    const refs = new Map<string, string[]>();

    const visit = (n: ts.Node) => {
      if (ts.isIdentifier(n)) {
        // Check if identifier is a parameter with a known type
        if (paramTypes.has(n.text)) {
          const typeName = paramTypes.get(n.text)!;
          if (types.has(typeName)) {
            // Use the parameter name as the key, not the type name
            refs.set(n.text, types.get(typeName)!);
          }
        }
        // Check if identifier is a type name (for direct usage)
        else if (types.has(n.text)) {
          refs.set(n.text, types.get(n.text)!);
        }
      }
      if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression)) {
        const enumName = n.expression.text;
        if (types.has(enumName)) {
          refs.set(enumName, types.get(enumName)!);
        }
      }
      ts.forEachChild(n, visit);
    };

    visit(node);
    return refs;
  }

  /**
   * Generate all possible paths from template and type references
   */
  private generatePathsFromTemplate(
    template: string,
    typeRefs: Map<string, string[]>
  ): string[] {
    if (typeRefs.size === 0) {
      return [template];
    }

    // For now, handle simple case with one type reference
    // TODO: Handle multiple type references with cartesian product
    const paths: string[] = [];

    for (const [typeName, values] of typeRefs) {
      for (const value of values) {
        // Replace ${typeName} with actual value
        const path = template.replace(new RegExp(`\\$\\{${typeName}[^}]*\\}`, 'g'), value);
        paths.push(path);
      }
    }

    return paths;
  }

  /**
   * Layer 3: Fallback - Pack all assets in referenced directories
   */
  async findDirectoryAssets(sourceDirs: string[]): Promise<Set<string>> {
    const assets = new Set<string>();
    const referencedDirs = new Set<string>();

    // Find directory references (e.g., './assets/flowers/')
    const dirPattern = /['"]([^'"]*\/)['"]/g;

    for (const dir of sourceDirs) {
      const files = await glob(join(dir, '**/*.{ts,tsx,js,jsx}'));

      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        let match;
        dirPattern.lastIndex = 0;

        while ((match = dirPattern.exec(content)) !== null) {
          const dirPath = match[1];

          // Check if it looks like an asset directory
          if (dirPath.includes('assets') || dirPath.includes('flowers') ||
              dirPath.includes('images') || dirPath.includes('sprites')) {
            referencedDirs.add(dirPath);
          }
        }
      }
    }

    // Pack all .png files in referenced directories
    for (const dir of referencedDirs) {
      const resolvedDir = resolve(process.cwd(), dir);
      if (existsSync(resolvedDir)) {
        const files = await glob(join(resolvedDir, '**/*.png'));
        for (const file of files) {
          const relativePath = relative(process.cwd(), file).replace(/\\/g, '/');
          assets.add(relativePath);
          if (this.verbose) {
            console.log(`  ⚠ Directory: ${relativePath}`);
          }
        }
      }
    }

    return assets;
  }

  /**
   * Combine all analysis results
   */
  async getAllAssets(sourceDirs: string[]): Promise<{
    static: Set<string>;
    typed: Set<string>;
    directory: Set<string>;
    all: Set<string>;
  }> {
    console.log('📊 Analyzing static references...');
    const staticAssets = await this.findStaticAssets(sourceDirs);
    console.log(`   Found ${staticAssets.size} statically referenced assets`);

    console.log('📊 Analyzing TypeScript types...');
    const typedAssets = await this.findTypedAssets(sourceDirs);
    console.log(`   Found ${typedAssets.size} type-derived assets`);

    // Remove already found assets from directory fallback
    const allFound = new Set([...staticAssets, ...typedAssets]);
    console.log('📊 Checking for directory fallbacks...');
    const directoryAssets = await this.findDirectoryAssets(sourceDirs);

    // Remove assets already found by other methods
    for (const asset of allFound) {
      directoryAssets.delete(asset);
    }

    if (directoryAssets.size > 0) {
      console.log(`   Found ${directoryAssets.size} additional assets via directory fallback`);
    }

    const all = new Set([...staticAssets, ...typedAssets, ...directoryAssets]);

    return {
      static: staticAssets,
      typed: typedAssets,
      directory: directoryAssets,
      all
    };
  }
}
