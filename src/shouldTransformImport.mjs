import path from "path";
import { getIfBarrel } from "./resolveWithCandidates.mjs";

export function createShouldTransformImport({ aliases, targetBarrel }) {
  const absoluteTargetBarrel = path.resolve(targetBarrel);

  return function shouldTransformImport({ importSource, filePath }) {
    let resolvedPath;

    if (importSource.startsWith(".")) {
      resolvedPath = path.resolve(path.dirname(filePath), importSource);
    } else {
      for (const alias of aliases) {
        if (importSource === alias.match) {
          return true;
        }
      }
    }

    if (!resolvedPath) {
      return false;
    }

    const resolvedBarrel = getIfBarrel(resolvedPath);

    if (!resolvedBarrel) {
      return null;
    }

    return absoluteTargetBarrel === resolvedBarrel;
  };
}
