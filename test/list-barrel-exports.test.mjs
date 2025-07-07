import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { listBarrelExports } from "../src/list-barrel-exports.mjs";

test("listBarrelExports should return all exports in flat barrel", async () => {
  const barrelPath = path.resolve("fixtures/barrel/flat-barrel/index.js");
  const result = await listBarrelExports(barrelPath);

  assert.deepEqual(result, {
    "fixtures/barrel/flat-barrel/app.js": ["appFn"],
    "fixtures/barrel/flat-barrel/utils.js": ["utilOne", "utilTwo"],
  });
});

test("listBarrelExports should return all exports in reexported barrel", async () => {
  const barrelPath = path.resolve("fixtures/barrel/reexports-barrel/index.js");
  const result = await listBarrelExports(barrelPath);

  assert.deepEqual(result, {
    "fixtures/barrel/reexports-barrel/app/app.js": ["appFn"],
    "fixtures/barrel/reexports-barrel/utils.js": ["utilOne", "utilTwo"],
  });
});

test("should handle export { named } from './file'", async () => {
  const barrelPath = path.resolve("fixtures/barrel/named-reexports/index.js");
  const result = await listBarrelExports(barrelPath);

  assert.deepEqual(result, {
    "fixtures/barrel/named-reexports/feature.js": ["doStuff"],
  });
});

test("should resolve absolute imports using basePath", async () => {
  const barrelPath = path.resolve("fixtures/barrel/absolute-imports/index.js");
  const result = await listBarrelExports(barrelPath, {
    basePath: path.resolve("fixtures/barrel/absolute-imports"),
  });

  assert.deepEqual(result, {
    "fixtures/barrel/absolute-imports/shared/helpers.js": ["foo", "bar"],
  });
});
