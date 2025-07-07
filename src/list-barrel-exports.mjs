import path from "path";
import jscodeshift from "jscodeshift";
import customParser from "./customParser.mjs";
import fs from "fs";
import { resolveWithCandidates } from "./resolveWithCandidates.mjs";

const includeDefaultExports = false;

function getExportsFromFile(code, j) {
  const exports = [];
  const reexports = [];
  const root = j(code);

  root.find(j.ExportNamedDeclaration).forEach((path) => {
    const node = path.node;

    if (node.exportKind === "type") return;

    if (node.source?.value) {
      const names = node.specifiers?.map((s) => s.exported.name) ?? [];
      reexports.push({
        path: node.source.value,
        names,
      });
      return;
    }

    if (node.declaration) {
      if (
        node.declaration.type === "FunctionDeclaration" &&
        node.declaration.id
      ) {
        exports.push(node.declaration.id.name);
      } else if (node.declaration.type === "VariableDeclaration") {
        for (const decl of node.declaration.declarations) {
          if (decl.id?.name) exports.push(decl.id.name);
        }
      } else if (node.declaration.id?.name) {
        exports.push(node.declaration.id.name);
      }
    }

    for (const specifier of node.specifiers || []) {
      exports.push(specifier.exported.name);
    }
  });

  //  export * from "./..."
  root.find(j.ExportAllDeclaration).forEach((path) => {
    const node = path.node;
    if (node.source?.value) {
      reexports.push({
        path: node.source.value,
        names: null, // null = export * from
      });
    }
  });

  if (includeDefaultExports) {
    root.find(j.ExportDefaultDeclaration).forEach(() => {
      exports.push("default");
    });
  }

  return { exports, reexports };
}

function resolvePath(fromFile, importPath, basePath) {
  if (importPath.startsWith(".")) {
    const full = path.resolve(path.dirname(fromFile), importPath);
    return resolveWithCandidates(full);
  }

  // Absolute import
  if (basePath) {
    const full = path.resolve(basePath, importPath);
    return resolveWithCandidates(full);
  }
  return null;
}

export async function listBarrelExports(barrelPath, { basePath } = {}) {
  const visited = new Set();
  const result = {};

  function visit(filePath, only = null) {
    if (visited.has(filePath)) return;
    visited.add(filePath);

    const source = fs.readFileSync(filePath, "utf-8");
    const isTS = filePath.endsWith(".ts") || filePath.endsWith(".tsx");
    const j = jscodeshift.withParser(isTS ? "tsx" : customParser());

    const { exports, reexports } = getExportsFromFile(source, j);
    const filteredExports = only
      ? exports.filter((e) => only.includes(e))
      : exports;

    const relative = path.relative(process.cwd(), filePath);
    if (filteredExports.length > 0) {
      result[relative] = filteredExports;
    }

    for (const reexport of reexports) {
      const resolvedPath = resolvePath(filePath, reexport.path, basePath);
      if (resolvedPath) {
        visit(resolvedPath, reexport.names);
      }
    }
  }

  visit(barrelPath);

  return result;
}
