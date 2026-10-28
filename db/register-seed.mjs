import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

// This Node binary reports process.features.typescript as false, so
// --experimental-strip-types throws ERR_NO_TYPESCRIPT. Transpile with the
// TypeScript already installed, and resolve the app's extensionless imports.
const root = path.resolve(import.meta.dirname, "..");
const fileExtensions = [".ts", ".tsx", ".mts", ".js", ".mjs", ".json"];

/**
 * @param {string} basePath
 * @returns {string | undefined}
 */
function resolveFile(basePath) {
  if (path.extname(basePath) && existsSync(basePath)) {
    return basePath;
  }

  for (const extension of fileExtensions) {
    const candidate = `${basePath}${extension}`;
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  for (const extension of [".ts", ".tsx", ".js"]) {
    const candidate = path.join(basePath, `index${extension}`);
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

/**
 * @param {string} filePath
 * @returns {"json" | "module"}
 */
function moduleFormat(filePath) {
  return filePath.endsWith(".json") ? "json" : "module";
}

registerHooks({
  /**
   * @param {string} specifier
   * @param {{ parentURL?: string }} context
   * @param {(specifier: string, context: { parentURL?: string }) => { url: string, format?: string, shortCircuit?: boolean }} nextResolve
   */
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const file = resolveFile(path.join(root, specifier.slice(2)));
      if (file) {
        return {
          url: pathToFileURL(file).href,
          shortCircuit: true,
          format: moduleFormat(file),
        };
      }
    }

    if (specifier.startsWith("./") || specifier.startsWith("../")) {
      const parentPath = context.parentURL
        ? fileURLToPath(context.parentURL)
        : root;
      const file = resolveFile(
        path.resolve(path.dirname(parentPath), specifier),
      );
      if (file) {
        return {
          url: pathToFileURL(file).href,
          shortCircuit: true,
          format: moduleFormat(file),
        };
      }
    }

    return nextResolve(specifier, context);
  },
  /**
   * @param {string} url
   * @param {unknown} context
   * @param {(url: string, context: unknown) => { format: string, source?: string | ArrayBuffer, shortCircuit?: boolean }} nextLoad
   */
  load(url, context, nextLoad) {
    if (
      url.startsWith("file:") &&
      (url.endsWith(".ts") || url.endsWith(".tsx") || url.endsWith(".mts"))
    ) {
      const filename = fileURLToPath(url);
      const source = readFileSync(filename, "utf8");
      const output = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
        fileName: filename,
      });

      return {
        format: "module",
        source: output.outputText,
        shortCircuit: true,
      };
    }

    return nextLoad(url, context);
  },
});
