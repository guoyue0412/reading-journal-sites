import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const categoryMap = new Map([
  ["秋招", "jobs"], ["实习", "internship"], ["论文", "papers"],
  ["每日感悟", "reflections"], ["感悟", "reflections"],
]);

async function walkMarkdown(directory) {
  const output = [];
  let entries;
  try { entries = await fs.readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === "ENOENT") return output; throw error; }
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walkMarkdown(fullPath));
    else if (entry.isFile() && entry.name.endsWith(".md")) output.push(fullPath);
  }
  return output.sort();
}

function parseNote(source, filePath) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error(`${filePath}: missing YAML frontmatter`);
  const metadata = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const separator = line.indexOf(":");
    if (separator > 0) metadata[line.slice(0, separator).trim()] = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  for (const field of ["title", "slug", "date", "summary", "status"]) {
    if (!metadata[field]) throw new Error(`${filePath}: frontmatter ${field} is required`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.slug) && !/^\d{4}-\d{2}-\d{2}$/.test(metadata.slug)) {
    throw new Error(`${filePath}: frontmatter slug must use lowercase letters, numbers and hyphens`);
  }
  return { frontmatter: match[1], body: match[2].trim(), metadata };
}

function withModule(frontmatter, moduleName) {
  if (/^type\s*:/m.test(frontmatter)) return frontmatter.replace(/^type\s*:.*$/m, `type: ${moduleName}`);
  return `${frontmatter}\ntype: ${moduleName}`;
}

function safeAssetName(slug, assetName) {
  const extension = path.extname(assetName).toLowerCase();
  const stem = path.basename(assetName, path.extname(assetName)).normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "asset";
  return `${slug}-${stem}${extension}`;
}

async function resolveAsset(rawTarget, notePath, vaultRoot) {
  const cleanTarget = rawTarget.split("|")[0].trim();
  const candidates = [path.resolve(path.dirname(notePath), cleanTarget),
    path.join(vaultRoot, "90_Attachments", path.basename(cleanTarget)), path.resolve(vaultRoot, cleanTarget)];
  for (const candidate of candidates) {
    try { if ((await fs.stat(candidate)).isFile()) return candidate; }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  throw new Error(`${notePath}: attachment not found: ${cleanTarget}`);
}

async function transformBody({ body, metadata, notePath, titleIndex, vaultRoot, publicRoot }) {
  const assetDirectory = path.join(publicRoot, "obsidian-assets");
  let transformed = "";
  let cursor = 0;
  for (const match of body.matchAll(/!\[\[([^\]]+)\]\]/g)) {
    transformed += body.slice(cursor, match.index);
    const assetPath = await resolveAsset(match[1], notePath, vaultRoot);
    const outputName = safeAssetName(metadata.slug, path.basename(assetPath));
    await fs.mkdir(assetDirectory, { recursive: true });
    await fs.copyFile(assetPath, path.join(assetDirectory, outputName));
    transformed += `![${path.basename(assetPath, path.extname(assetPath))}](/obsidian-assets/${encodeURIComponent(outputName)})`;
    cursor = match.index + match[0].length;
  }
  transformed += body.slice(cursor);
  return transformed.replace(/(?<!!)\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (whole, target, alias) => {
    const normalized = target.trim();
    const slug = titleIndex.get(normalized) ?? titleIndex.get(path.basename(normalized, ".md"));
    if (!slug) { console.warn(`${notePath}: unresolved wikilink "${normalized}"; keeping visible text.`); return alias?.trim() || normalized; }
    return `[${alias?.trim() || normalized}](/post/${slug})`;
  });
}

export async function syncObsidianBlog({ sourceRoot, vaultRoot, contentRoot, publicRoot }) {
  const notes = [];
  for (const [folder, moduleName] of categoryMap) {
    for (const notePath of await walkMarkdown(path.join(sourceRoot, folder))) {
      notes.push({ ...parseNote(await fs.readFile(notePath, "utf8"), notePath), notePath, moduleName });
    }
  }
  const titleIndex = new Map();
  for (const note of notes) {
    titleIndex.set(note.metadata.title, note.metadata.slug);
    titleIndex.set(path.basename(note.notePath, ".md"), note.metadata.slug);
  }
  for (const note of notes) {
    const body = await transformBody({ ...note, titleIndex, vaultRoot, publicRoot });
    const destinationDirectory = path.join(contentRoot, note.moduleName);
    await fs.mkdir(destinationDirectory, { recursive: true });
    await fs.writeFile(path.join(destinationDirectory, `${note.metadata.slug}.md`),
      `---\n${withModule(note.frontmatter, note.moduleName)}\n---\n\n${body}\n`, "utf8");
  }
  return { synced: notes.length };
}

async function main() {
  const configPath = path.join(projectRoot, ".obsidian-blog.local.json");
  let config;
  try { config = JSON.parse(await fs.readFile(configPath, "utf8")); }
  catch (error) {
    if (error.code === "ENOENT") throw new Error(`Missing ${configPath}; copy .obsidian-blog.example.json and set sourceRoot.`);
    throw error;
  }
  const sourceRoot = path.resolve(config.sourceRoot);
  const result = await syncObsidianBlog({ sourceRoot, vaultRoot: path.resolve(config.vaultRoot ?? path.dirname(sourceRoot)),
    contentRoot: path.join(projectRoot, "content"), publicRoot: path.join(projectRoot, "public") });
  console.log(`Synced ${result.synced} Obsidian blog note(s).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
