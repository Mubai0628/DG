import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

await mkdir(dist, { recursive: true });
await copyFile(
  path.join(root, "manifest.json"),
  path.join(dist, "manifest.json")
);
await copyFile(path.join(root, "popup.html"), path.join(dist, "popup.html"));
