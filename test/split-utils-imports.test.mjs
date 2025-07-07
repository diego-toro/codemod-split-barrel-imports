import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { runCodeMod } from "../src/split-utils-imports.mjs";

test("runCodeMod should split named imports into per-file imports", async () => {
  const writeCalls = [];
  const originalWriteFileSync = fs.writeFileSync;

  fs.writeFileSync = (...args) => {
    writeCalls.push(args);
  };

  const barrelExportsMap = {
    "fixtures/codemod/relative-imports/src/utils/innerUtils/foo.js": ["foo"],
    "fixtures/codemod/relative-imports/src/utils/innerUtils/bar.js": ["bar"],
  };
  try {
    await runCodeMod(
      path.resolve("fixtures/codemod/relative-imports/src/utils"),
      {
        basePath: path.resolve("fixtures/codemod/relative-imports/src"),
        barrelExportsMap,
        excludeSymbols: new Set(),
      }
    );

    const [filePath, writtenContent] = writeCalls[0];

    assert.ok(filePath.endsWith("test.js"));

    assert.equal(
      writtenContent.trim(),
      [
        'import React from "react";',
        'import { foo } from "./innerUtils/foo";',
        'import { bar } from "./innerUtils/bar";',
        "",
        "console.log(foo, bar);",
      ].join("\n")
    );
  } finally {
    fs.writeFileSync = originalWriteFileSync;
  }
});

test("should preserve excluded symbols in the original import", async () => {
  const writeCalls = [];
  const originalWriteFileSync = fs.writeFileSync;

  fs.writeFileSync = (...args) => {
    writeCalls.push(args);
  };

  const barrelExportsMap = {
    "fixtures/codemod/exclude-symbols/src/utils/innerUtils/foo.js": ["foo"],
    "fixtures/codemod/exclude-symbols/src/utils/innerUtils/bar.js": ["bar"],
    "fixtures/codemod/exclude-symbols/src/utils/innerUtils/biz.js": ["biz"],
  };

  try {
    await runCodeMod(
      path.resolve("fixtures/codemod/exclude-symbols/src/utils"),
      {
        basePath: path.resolve("fixtures/codemod/exclude-symbols/src"),
        barrelExportsMap,
        aliases: [
          {
            match: "utils",
            path: "fixtures/codemod/exclude-symbols/src/utils",
          },
        ],
        excludeSymbols: new Set(["foo"]),
      }
    );

    const [filePath, writtenContent] = writeCalls[0];

    assert.ok(filePath.endsWith("test.js"));

    assert.equal(
      writtenContent.trim(),
      [
        'import { foo } from "utils/innerUtils";',
        'import { bar } from "utils/innerUtils/bar";',
        'import { biz } from "utils/innerUtils/biz";',
        "",
        "console.log(foo, bar, biz);",
      ].join("\n")
    );
  } finally {
    fs.writeFileSync = originalWriteFileSync;
  }
});

test("should throw if a symbol is missing from the barrel map", async () => {
  const writeCalls = [];
  const originalWriteFileSync = fs.writeFileSync;

  fs.writeFileSync = (...args) => {
    writeCalls.push(args);
  };

  const barrelExportsMap = {
    "fixtures/codemod/missing-symbol/src/utils/innerUtils/foo.js": ["foo"],
    // 'missing' is intentionally missing
  };

  let threw = false;

  try {
    await runCodeMod(
      path.resolve("fixtures/codemod/missing-symbol/src/utils"),
      {
        basePath: path.resolve("fixtures/codemod/missing-symbol/src"),
        barrelExportsMap,
        aliases: [
          {
            match: "utils",
            path: "fixtures/codemod/exclude-symbols/src/utils",
          },
        ],
        excludeSymbols: new Set(),
      }
    );
  } catch (err) {
    threw = true;
    assert.match(String(err), /'missing': no export found/);
  } finally {
    fs.writeFileSync = originalWriteFileSync;
  }

  assert.equal(threw, true, "Expected runCodeMod to throw on missing symbol");
  assert.equal(
    writeCalls.length,
    0,
    "Should not write anything if error occurs"
  );
});

test("should preserve default import and split named ones", async () => {
  const writeCalls = [];
  const originalWriteFileSync = fs.writeFileSync;
  fs.writeFileSync = (...args) => {
    writeCalls.push(args);
  };

  const barrelExportsMap = {
    "fixtures/codemod/default-import/src/utils/innerUtils/foo.js": ["foo"],
  };

  try {
    await runCodeMod(
      path.resolve("fixtures/codemod/default-import/src/utils"),
      {
        basePath: path.resolve("fixtures/codemod/default-import/src"),
        barrelExportsMap,
        aliases: [
          {
            match: "utils",
            path: "fixtures/codemod/exclude-symbols/src/utils",
          },
        ],
        excludeSymbols: new Set(),
      }
    );

    const [filePath, writtenContent] = writeCalls[0];

    assert.ok(filePath.endsWith("test.js"));

    assert.equal(
      writtenContent.trim(),
      [
        'import utils from "utils/innerUtils";',
        'import { foo } from "utils/innerUtils/foo";',
        "",
        "console.log(utils, foo);",
      ].join("\n")
    );
  } finally {
    fs.writeFileSync = originalWriteFileSync;
  }
});

test("should strip /index from paths in barrelExportsMap", async () => {
  const writeCalls = [];
  const originalWriteFileSync = fs.writeFileSync;

  fs.writeFileSync = (...args) => {
    writeCalls.push(args);
  };

  const barrelExportsMap = {
    "fixtures/codemod/strip-index/src/utils/foo/index.js": ["foo"],
  };

  try {
    await runCodeMod(path.resolve("fixtures/codemod/strip-index/src/utils"), {
      basePath: path.resolve("fixtures/codemod/strip-index/src"),
      barrelExportsMap,
      aliases: [
        { match: "utils", path: "fixtures/codemod/exclude-symbols/src/utils" },
      ],
      excludeSymbols: new Set(),
    });

    const [filePath, writtenContent] = writeCalls[0];

    assert.ok(filePath.endsWith("test.js"));

    assert.equal(
      writtenContent.trim(),
      ['import { foo } from "utils/foo";', "", "console.log(foo);"].join("\n")
    );
  } finally {
    fs.writeFileSync = originalWriteFileSync;
  }
});

test("should preserve unrelated imports", async () => {
  const writeCalls = [];
  const originalWriteFileSync = fs.writeFileSync;

  fs.writeFileSync = (...args) => {
    writeCalls.push(args);
  };

  const barrelExportsMap = {
    "fixtures/codemod/preserve-unrelated/src/utils/innerUtils/foo.js": ["foo"],
  };

  try {
    await runCodeMod(
      path.resolve("fixtures/codemod/preserve-unrelated/src/utils"),
      {
        basePath: path.resolve("fixtures/codemod/preserve-unrelated/src"),
        barrelExportsMap,
        aliases: [
          {
            match: "utils",
            path: "fixtures/codemod/exclude-symbols/src/utils",
          },
        ],
        excludeSymbols: new Set(),
      }
    );

    const [filePath, writtenContent] = writeCalls[0];

    assert.ok(filePath.endsWith("test.ts"));

    assert.equal(
      writtenContent.trim(),
      [
        "// @ts-nocheck",
        'import type { Something } from "some-lib";',
        'import "polyfill";',
        'import { foo } from "utils/innerUtils/foo";',
        "",
        "console.log(foo);",
      ].join("\n")
    );
  } finally {
    fs.writeFileSync = originalWriteFileSync;
  }
});

test("should not modify imports that are outside basePath or aliases", async () => {
  const writeCalls = [];
  const originalWriteFileSync = fs.writeFileSync;

  fs.writeFileSync = (...args) => {
    writeCalls.push(args);
  };

  const barrelExportsMap = {
    "fixtures/codemod/ignore-non-target/src/utils/foo.js": ["foo"],
  };

  const fixturePath = path.resolve("fixtures/codemod/ignore-non-target/src");

  try {
    await runCodeMod(fixturePath, {
      basePath: path.resolve("fixtures/codemod/ignore-non-target/src/utils"),
      barrelExportsMap,
      excludeSymbols: new Set(),
    });

    if (writeCalls.length > 0) {
      const [targetFile, writtenContent] = writeCalls[0];
      assert.equal(targetFile, testFilePath);
      assert.equal(
        writtenContent,
        [
          'import { something } from "./not-utils";',
          "",
          "console.log(something);",
        ].join("\n")
      );
    } else {
      assert.ok(true);
    }
  } finally {
    fs.writeFileSync = originalWriteFileSync;
  }
});
