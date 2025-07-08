import fs from "fs";

export function resolveWithCandidates(basePath) {
  const candidates = [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    "/index.ts",
    "/index.tsx",
    "/index.js",
    "/index.jsx",
  ];

  for (const ext of candidates) {
    const fullPath = basePath + ext;
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return null;
}

export function getIfBarrel(basePath) {
  const candidates = ["/index.ts", "/index.tsx", "/index.js", "/index.jsx"];

  for (const ext of candidates) {
    const fullPath = basePath + ext;
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return null;
}
