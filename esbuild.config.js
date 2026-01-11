import esbuild from "esbuild";

const entryFile = "main.mjs";
const outFile = "dist/main.js";

await esbuild.build({
  entryPoints: [entryFile],
  bundle: true,
  outfile: outFile,
  format: "esm",
  sourcemap: false,
  minify: true,
  platform: "browser",
  target: ["es2020"],
});

console.log("Build completed!");
