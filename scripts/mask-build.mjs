import crypto from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const targets = [path.join(root, ".next", "server"), path.join(root, ".next", "static")];
const textFiles = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".mjs",
  ".rsc",
  ".txt",
]);
const names =
  /\b(?:ProfileCard|ActivityCard|SpotifyCard|StatusBadge|ViewCounter|Cursor)_[A-Za-z0-9_-]+__[A-Za-z0-9_-]+\b/g;
const map = new Map();

function code(value) {
  return `_${crypto.createHash("sha256").update(value).digest("base64url").slice(0, 10)}`;
}

async function files(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const found = [];

    for (const entry of entries) {
      const file = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        found.push(...(await files(file)));
      } else if (textFiles.has(path.extname(entry.name))) {
        const info = await stat(file);

        if (info.size < 8 * 1024 * 1024) {
          found.push(file);
        }
      }
    }

    return found;
  } catch {
    return [];
  }
}

function mask(text) {
  return text.replace(names, (name) => {
    if (!map.has(name)) {
      map.set(name, code(name));
    }

    return map.get(name);
  });
}

const allFiles = (await Promise.all(targets.map(files))).flat();

for (const file of allFiles) {
  const text = await readFile(file, "utf8");
  const matches = text.match(names);

  if (!matches) {
    continue;
  }

  await writeFile(file, mask(text));
}

console.log(`masked ${map.size} css module names`);
