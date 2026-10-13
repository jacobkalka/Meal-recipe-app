/**
 * Builds the app as one self-contained page for a claude.ai artifact:
 *   node artifact/build.mjs [outDir]     (default: dist-artifact/)
 *
 * Output: <outDir>/index.html plus <outDir>/seed/*.svg. The screens are the
 * same as the Next.js app; Next's router is swapped for an in-memory one and
 * AI calls go through the artifact's `sample` capability (artifact/sample-api.ts)
 * instead of our API routes. React loads from cdnjs as the artifact CSP requires.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.resolve(process.argv[2] ?? path.join(root, "dist-artifact"));
mkdirSync(path.join(out, "seed"), { recursive: true });

const REACT_VERSION = "18.3.1";
const APP_NAME = /APP_NAME = "([^"]+)"/.exec(readFileSync(path.join(root, "src/lib/config.ts"), "utf8"))[1];

// 1. Tailwind CSS from the app's own globals.css.
const cssPath = path.join(out, ".app.css");
execFileSync(
  path.join(root, "node_modules/.bin/tailwindcss"),
  ["-i", path.join(root, "src/app/globals.css"), "-o", cssPath, "--minify"],
  { cwd: root, stdio: ["ignore", "ignore", "inherit"] },
);
const css = readFileSync(cssPath, "utf8");
rmSync(cssPath);

// 2. Plus Jakarta Sans (latin, variable) inlined, since only Google Fonts may load externally.
const fontFile = path.join(root, "node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2");
const fontFace = `@font-face{font-family:"Plus Jakarta Sans Variable";font-style:normal;font-display:swap;font-weight:200 800;src:url(data:font/woff2;base64,${readFileSync(fontFile).toString("base64")}) format("woff2-variations")}`;

// 3. JavaScript bundle.
const shim = (file) => path.join(root, "artifact/shims", file);
const reactGlobals = {
  name: "react-globals",
  setup(b) {
    b.onResolve({ filter: /^(react|react-dom|react-dom\/client|react\/jsx-runtime)$/ }, (args) => ({ path: args.path, namespace: "react-global" }));
    b.onLoad({ filter: /.*/, namespace: "react-global" }, (args) => {
      if (args.path === "react/jsx-runtime") {
        return {
          loader: "js",
          contents: `var R=window.React;function jsx(t,p,k){if(k!==undefined)p=Object.assign({},p,{key:k});return R.createElement(t,p)}module.exports={jsx:jsx,jsxs:jsx,Fragment:R.Fragment};`,
        };
      }
      return { loader: "js", contents: `module.exports=window.${args.path === "react" ? "React" : "ReactDOM"};` };
    });
  },
};
const aliases = {
  name: "aliases",
  setup(b) {
    b.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: shim("navigation.tsx") }));
    b.onResolve({ filter: /^next\/link$/ }, () => ({ path: shim("link.tsx") }));
    b.onResolve({ filter: /^server-only$/ }, () => ({ path: shim("empty.ts") }));
    b.onResolve({ filter: /^@\/lib\/api$/ }, () => ({ path: path.join(root, "artifact/sample-api.ts") }));
    b.onResolve({ filter: /^\.\/api$/ }, (args) =>
      args.importer === path.join(root, "src/lib/flows.ts") ? { path: path.join(root, "artifact/sample-api.ts") } : undefined,
    );
  },
};

const result = await build({
  entryPoints: [path.join(root, "artifact/main.tsx")],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  target: ["es2020", "safari15"],
  jsx: "automatic",
  tsconfig: path.join(root, "tsconfig.json"),
  legalComments: "none",
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_NO_SW": '"1"',
  },
  plugins: [reactGlobals, aliases],
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

// 4. Page (the artifact host wraps it in <html>/<head>/<body>).
const html = `<title>${APP_NAME}</title>
<style>${fontFace}${css}#boot{min-height:60vh;display:flex;align-items:center;justify-content:center;color:#6e6e6e;font:600 15px/1.4 "Plus Jakarta Sans Variable",system-ui,sans-serif}</style>
<div id="root"><div id="boot">Loading ${APP_NAME}…</div></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/${REACT_VERSION}/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/${REACT_VERSION}/umd/react-dom.production.min.js"></script>
<script>${js}</script>
`;
writeFileSync(path.join(out, "index.html"), html);
for (const file of readdirSync(path.join(root, "public/seed"))) {
  copyFileSync(path.join(root, "public/seed", file), path.join(out, "seed", file));
}
console.log(`Built ${path.relative(root, path.join(out, "index.html"))} (${Math.round(html.length / 1024)} KB)`);
