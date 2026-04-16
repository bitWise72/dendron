import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import { string } from 'rollup-plugin-string';
import dts from 'rollup-plugin-dts';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

const banner = `/*!
 * dendron-sdk v${pkg.version}
 * The Zero-Liability Behavioral Intelligence SDK
 * (c) ${new Date().getFullYear()} Dendron SDK Team
 * @license MIT
 */`;

// Transformers.js is an optional peer dep — never bundle it.
// It's lazy-loaded at runtime via dynamic import().
const external = [/@xenova\/transformers/, /onnxruntime/];

const basePlugins = [
  string({ include: '**/*.css' }),
  resolve({ browser: true, preferBuiltins: false }),
  typescript({
    tsconfig: './tsconfig.json',
    declaration: false,
    compilerOptions: {
      declaration: false,
      declarationMap: false,
    }
  }),
];

export default [
  // ESM bundle
  {
    input: 'src/index.ts',
    external,
    output: {
      file: pkg.module,
      format: 'esm',
      banner,
      sourcemap: true,
      inlineDynamicImports: true,
    },
    plugins: basePlugins,
  },
  // CJS bundle (Node.js)
  {
    input: 'src/index.ts',
    external,
    output: {
      file: pkg.main,
      format: 'cjs',
      exports: 'named',
      banner,
      sourcemap: true,
      inlineDynamicImports: true,
    },
    plugins: basePlugins,
  },
  // UMD minified browser bundle
  {
    input: 'src/index.ts',
    external,
    output: {
      file: pkg.browser,
      format: 'umd',
      name: 'Dendron',
      banner,
      sourcemap: true,
      inlineDynamicImports: true,
    },
    plugins: [
      ...basePlugins,
      terser({
        compress: {
          passes: 2,
          drop_console: true,
        },
        format: { comments: /^!/ },
      }),
    ],
  },
  // Type declarations
  {
    input: 'src/index.ts',
    external,
    output: {
      file: pkg.types,
      format: 'esm',
    },
    plugins: [dts()],
  },
];
