#!/usr/bin/env node

import path from "path";
import { readFileSync } from "fs";
import { runCodeMod } from "../src/split-utils-imports.mjs";

function parseArgs(argv) {
  const args = {
    positional: [],
    basePath: null,
    aliases: [],
    excludeSymbols: new Set(),
    targetBarrel: null,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--basePath") {
      args.basePath = path.resolve(argv[++i]);
    } else if (arg === "--alias") {
      const [match, aliasPath] = argv[++i].split("=");
      if (match && aliasPath) {
        args.aliases.push({ match, path: path.resolve(aliasPath) });
      }
    } else if (arg === "--exclude") {
      const symbols = argv[++i].split(",").map((s) => s.trim());
      for (const symbol of symbols) {
        args.excludeSymbols.add(symbol);
      }
    } else if (arg === "--targetBarrel") {
      args.targetBarrel = argv[++i];
    } else {
      args.positional.push(arg);
    }
  }

  return args;
}

const args = parseArgs(process.argv);
const [srcDir, barrelMapPath] = args.positional;

if (!srcDir || !barrelMapPath) {
  console.error(
    "❌ Usage: split-utils-imports <srcDir> <barrelMap.json> [--basePath path] [--alias alias=path] [--exclude a,b,c]"
  );
  process.exit(1);
}

const basePath = args.basePath || path.resolve(srcDir);
const barrelExportsMap = JSON.parse(readFileSync(barrelMapPath, "utf-8"));

runCodeMod(path.resolve(srcDir), {
  basePath,
  aliases: args.aliases,
  barrelExportsMap,
  excludeSymbols: args.excludeSymbols,
  targetBarrel: args.targetBarrel,
});
