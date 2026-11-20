/**
 * Copyright (C) 2024 Robin Lamberti.
 * 
 * This file is part of kino-in-karlsruhe.
 * 
 * kino-in-karlsruhe is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * kino-in-karlsruhe is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with kino-in-karlsruhe. If not, see <http://www.gnu.org/licenses/>.
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

// Runs after `next build`: writes public/sw.js with a precache list of the
// build's static files, the app's icons and manifest, and the small files in
// public/. The version hashes their contents and the worker itself, so every
// change installs a fresh cache and updates installed apps.
const root = path.resolve(import.meta.dirname, "..");
const SW = "sw.js";
// The sneak preview posters are megabytes each; they load from the network.
const MAX_PUBLIC_SIZE = 256 * 1024;

function files(dir: string, base = dir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? files(full, base) : [path.relative(base, full)];
  });
}

const toUrl = (prefix: string, file: string) => `${prefix}/${file.split(path.sep).join("/")}`;
const staticDir = path.join(root, ".next/static");
const publicDir = path.join(root, "public");
const appDir = path.join(root, "src/app");
// Next.js serves these metadata files from src/app at the site root.
const METADATA = /^(favicon\.ico|(apple-)?icon\.\w+|manifest\.json)$/;

const entries = [
  ...files(staticDir).map((file) => ({ url: toUrl("/_next/static", file), source: path.join(staticDir, file) })),
  ...readdirSync(appDir)
    .filter((file) => METADATA.test(file))
    .map((file) => ({ url: `/${file}`, source: path.join(appDir, file) })),
  ...files(publicDir)
    .filter((file) => file !== SW && statSync(path.join(publicDir, file)).size <= MAX_PUBLIC_SIZE)
    .map((file) => ({ url: toUrl("", file), source: path.join(publicDir, file) })),
].sort((a, b) => a.url.localeCompare(b.url));

const template = readFileSync(path.join(import.meta.dirname, SW), "utf8");
const hash = createHash("sha256").update(template);
for (const { url, source } of entries) hash.update(url).update(readFileSync(source));
const version = hash.digest("hex").slice(0, 12);

writeFileSync(path.join(publicDir, SW), template
  .replace('"__PWA_VERSION__"', JSON.stringify(version))
  .replace('"__PWA_PRECACHE__"', JSON.stringify(entries.map(({ url }) => url))));
console.log(`Wrote public/${SW}: version ${version}, ${entries.length} files precached`);
