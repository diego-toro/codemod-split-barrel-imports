import path from "path";
import { listBarrelExports } from "../src/list-barrel-exports.mjs";

const [, , barrelArg, ...restArgs] = process.argv;

if (!barrelArg) {
  console.error("❌ missing barrel path.");
  process.exit(1);
}

const basepathArg = restArgs.find((arg) => arg.startsWith("--basepath="));

const options = basepathArg
  ? { basePath: path.resolve(basepathArg.split("=")[1]) }
  : undefined;

const result = await listBarrelExports(path.resolve(barrelArg), options);

console.log(JSON.stringify(result, null, 2));
