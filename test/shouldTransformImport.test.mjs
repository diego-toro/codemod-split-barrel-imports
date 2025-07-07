import { describe, test } from "node:test";
import assert from "node:assert/strict";
import path from "path";
import { shouldTransformImport } from "../src/shouldTransformImport.mjs";

const basePath = path.resolve("fixtures/codemod/relative-imports/src");

const barrelExportsMap = {
  [path.join(basePath, "utils/innerUtils/bar.js")]: ["bar"],
  [path.join(basePath, "utils/innerUtils/foo.js")]: ["foo"],
};

describe("shouldTransformImport", () => {
  const currentFile = path.join(basePath, "utils/file.js");

  test("matches a barrel file", () => {
    const result = shouldTransformImport({
      importSource: "./innerUtils",
      filePath: currentFile,
      aliases: [],
      barrelExportsMap,
    });
    assert.equal(result, true);
  });

  test("matches an alias path", () => {
    const result = shouldTransformImport({
      importSource: "utils/innerUtils",
      filePath: currentFile,
      basePath,
      aliases: [
        {
          match: "utils",
          path: basePath,
        },
      ],
      barrelExportsMap,
    });
    assert.equal(result, true);
  });

  test("returns false for unrelated relative import", () => {
    const result = shouldTransformImport({
      importSource: "./innerUtils/foo",
      filePath: currentFile,
      basePath,
      aliases: [],
      barrelExportsMap,
    });
    assert.equal(result, false);
  });

  test("returns false for unrelated alias import", () => {
    const result = shouldTransformImport({
      importSource: "utils/innerUtils/unkown",
      filePath: currentFile,
      basePath,
      aliases: [
        {
          match: "utils",
          path: basePath,
        },
      ],
      barrelExportsMap,
    });
    assert.equal(result, false);
  });
});
