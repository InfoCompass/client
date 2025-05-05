import * as esbuild from "npm:esbuild"
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader"

const result = await esbuild.build({
  plugins: [...denoPlugins()],
  entryPoints: [
    "./node_modules/@mappo-aggregato/mappo-aggregato/src/mod.ts",
  ],
  outfile: "./mappo-aggregato.js",
  bundle: true,
  format: "iife",
  globalName: 'Mappo'
})

esbuild.stop();
