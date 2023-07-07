import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import dotenv from "rollup-plugin-dotenv";
import terser from "@rollup/plugin-terser";
import { visualizer } from "rollup-plugin-visualizer";

const production = process.env.MINIFY;

export default {
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [
    dotenv(),
    json(),
    typescript({
      sourceMap: !production,
    }),
    resolve({
      preferBuiltins: true,
    }),
    commonjs(),
    production && terser(),
    visualizer()
  ],
  external: [
    'zod',
    'bn.js',
    '@ethersproject/providers',
    '@ethersproject/contracts',
    '@uniswap/permit2-sdk'
  ],
  onwarn: (warning, warn) =>  {
    if (warning.code === 'THIS_IS_UNDEFINED') return;
    warn(warning);
  }
};
