import jscodeshift from "jscodeshift";
import fs from "fs";
import { glob } from "glob";
import customParser from "./customParser.mjs";
import path from "path";
import { shouldTransformImport } from "./shouldTransformImport.mjs";

export async function runCodeMod(
  srcDirToTransform,
  { basePath, aliases = [], barrelExportsMap, excludeSymbols }
) {
  const exportToFileMap = Object.entries(barrelExportsMap).reduce(
    (acc, [rawFilePath, exports]) => {
      let cleanedPath = path.relative(basePath, rawFilePath);

      cleanedPath = cleanedPath.replace(/\.(js|ts|jsx|tsx)$/, "");
      cleanedPath = cleanedPath.replace(/\/index$/, "");

      for (const exp of exports) {
        acc[exp] = cleanedPath;
      }

      return acc;
    },
    {}
  );

  const absoluteBarrelMap = new Set(
    Object.keys(barrelExportsMap).map((p) => path.relative(basePath, p))
  );

  function buildImportPath({ sourcePath, file, filePath, basePath }) {
    if (!sourcePath.startsWith(".")) {
      return file;
    }

    const absoluteTarget = path.resolve(basePath, file);
    let newPath = path.relative(path.dirname(filePath), absoluteTarget);

    if (!newPath.startsWith(".")) {
      newPath = "./" + newPath;
    }

    return newPath.split(path.sep).join("/");
  }

  function transformer(source, j, filePath) {
    const root = j(source);

    const utilsImport = root.find(j.ImportDeclaration).filter((pathNode) => {
      const importSource = pathNode.node.source.value;
      return shouldTransformImport({
        importSource,
        basePath,
        filePath,
        aliases,
        absoluteBarrelMap,
      });
    });

    if (!utilsImport.size()) return null;

    utilsImport.forEach((importPath) => {
      const sourceText = source.slice(
        importPath.node.start,
        importPath.node.end
      );
      const endsWithSemicolon = sourceText.trimEnd().endsWith(";");

      const sourcePath = importPath.node.source.value;
      const specifiers = importPath.node.specifiers;
      const defaultSpec = specifiers.find(
        (s) => s.type === "ImportDefaultSpecifier"
      );
      const named = specifiers.filter((s) => s.type === "ImportSpecifier");

      const importsByFile = {};
      const remainingSpecs = [defaultSpec].filter(Boolean);

      for (const spec of named) {
        const name = spec.imported.name;
        const file = exportToFileMap[name];

        if (excludeSymbols.has(name)) {
          remainingSpecs.push(spec);
          continue;
        }

        if (file === null || file === undefined) {
          throw `⚠️ '${name}': no export found`;
        }

        const newImportPath = buildImportPath({
          sourcePath,
          file,
          filePath,
          basePath,
        });

        if (!importsByFile[newImportPath]) {
          importsByFile[newImportPath] = [];
        }
        importsByFile[newImportPath].push(spec);
      }

      const newImports = [];

      if (remainingSpecs.length > 0) {
        const decl = j.importDeclaration(remainingSpecs, j.literal(sourcePath));
        decl.semi = endsWithSemicolon;
        newImports.push(decl);
      }

      for (const [newPath, specs] of Object.entries(importsByFile)) {
        const decl = j.importDeclaration(specs, j.literal(newPath));
        decl.semi = endsWithSemicolon;
        newImports.push(decl);
      }

      const printedImports = newImports.map((decl) => {
        const code = j(decl).toSource();
        return endsWithSemicolon ? code : code.replace(/;$/, "");
      });

      j(importPath).replaceWith(printedImports);
    });

    return root.toSource();
  }

  const files = await glob("**/*.{js,jsx,ts,tsx}", {
    cwd: srcDirToTransform,
    absolute: true,
    ignore: [
      "**/node_modules/**",
      "**/build/**",
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/.cache/**",
      "**/coverage/**",
      "**/.storybook/**",
    ],
  });

  for (const filePath of files) {
    try {
      const isTS = filePath.endsWith(".ts") || filePath.endsWith(".tsx");

      const source = fs.readFileSync(filePath, "utf-8");

      const j = jscodeshift.withParser(isTS ? "tsx" : customParser());

      const newSource = transformer(source, j, filePath);
      if (newSource) {
        console.log("TRANSOFMED:", filePath);
        fs.writeFileSync(filePath, newSource, "utf-8");
      }
    } catch (error) {
      console.log(filePath);
      console.error(error);
      throw error;
    }
  }
}
