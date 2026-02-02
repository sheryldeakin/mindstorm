/* eslint-disable no-console */
"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const pkgPath = path.join(repoRoot, "package.json");

const blockedPrefixes = [
  "@esbuild/darwin-",
  "@esbuild/win32-",
  "@esbuild/linux-",
  "@rollup/rollup-darwin-",
  "@rollup/rollup-win32-",
  "@rollup/rollup-linux-",
];

function findBlockedDeps(pkgJson) {
  const deps = {
    ...(pkgJson.dependencies || {}),
    ...(pkgJson.devDependencies || {}),
    ...(pkgJson.optionalDependencies || {}),
  };

  const hits = [];
  for (const name of Object.keys(deps)) {
    if (blockedPrefixes.some((prefix) => name.startsWith(prefix))) {
      hits.push(name);
    }
  }
  return hits;
}

function main() {
  if (!fs.existsSync(pkgPath)) {
    console.error("preinstall: package.json not found.");
    process.exit(1);
  }

  const raw = fs.readFileSync(pkgPath, "utf8");
  const pkgJson = JSON.parse(raw);
  const hits = findBlockedDeps(pkgJson);

  if (hits.length === 0) {
    return;
  }

  console.error("preinstall: platform-specific packages detected:");
  for (const name of hits) {
    console.error(`  - ${name}`);
  }
  console.error(
    "Remove these from package.json. They should be installed transitively by tooling."
  );
  process.exit(1);
}

main();
