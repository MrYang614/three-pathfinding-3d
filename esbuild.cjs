const { build } = require("esbuild")

build({
    entryPoints: ["src/index.ts"],
    outdir: "/build",
    format: "esm",
    bundle: true,
    sourcemap: true,
    external: ["three"],
}).catch(err => {
    console.log(err);
    process.exit(1)
})