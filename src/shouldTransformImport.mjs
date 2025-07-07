import path from "path";
import { isBarrel } from "./resolveWithCandidates.mjs";

export function shouldTransformImport({ importSource, filePath, aliases }) {
  const isRelative = importSource.startsWith(".");

  if (isRelative) {
    const resolvedPath = path.resolve(path.dirname(filePath), importSource);
    return isBarrel(resolvedPath);
  }

  for (const alias of aliases) {
    if (
      importSource === alias.match ||
      importSource.startsWith(`${alias.match}/`)
    ) {
      const suffix = importSource.slice(alias.match.length + 1);
      const resolvedPath = path.resolve(path.dirname(filePath), suffix);
      return isBarrel(resolvedPath);
    }
  }

  return false;
}
