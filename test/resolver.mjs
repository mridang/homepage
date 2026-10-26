import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = new URL('../src/', import.meta.url);

/** The file a specifier names, trying the TypeScript extensions. */
function withExtension(url) {
  const path = fileURLToPath(url);
  return [path, `${path}.ts`, `${path}/index.ts`]
    .map((candidate) => pathToFileURL(candidate))
    .find((candidate) => existsSync(candidate) && /\.ts$/.test(candidate.href));
}

export function resolve(specifier, context, next) {
  const target = specifier.startsWith('@/')
    ? new URL(specifier.slice(2), SRC)
    : specifier.startsWith('.') && context.parentURL
      ? new URL(specifier, context.parentURL)
      : undefined;
  const found = target ? withExtension(target) : undefined;
  return found ? next(found.href, context) : next(specifier, context);
}
