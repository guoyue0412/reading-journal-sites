import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modules = ["jobs", "internship", "papers", "reflections"];
const readingMethods = ["skim", "deep", "synthesis"];
const readingStatuses = ["queued", "in_progress", "synthesizing", "completed", "archived"];
const applicationStages = ["applied", "written_test", "interview", "offer", "closed"];
const methodSections = new Map([
  ["skim", "粗读记录"],
  ["deep", "细读记录"],
  ["synthesis", "阅读总结"],
]);

function cliPath(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index < 0) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a path`);
  return path.resolve(process.cwd(), value);
}

const contentRoot = cliPath("--content-root", path.join(root, "content"));
const outputPath = cliPath("--output", path.join(root, "lib/content/generated.ts"));

function parseScalar(raw) {
  const value = raw.trim();
  if (value.startsWith("[") && value.endsWith("]")) {
    const body = value.slice(1, -1).trim();
    return body ? body.split(",").map((item) => parseScalar(item)) : [];
  }
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  if (value === "true") return true;
  if (value === "false") return false;
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) return value.slice(1, -1);
  return value;
}

function parseMarkdown(source, filePath) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error(`Missing frontmatter: ${filePath}`);
  const metadata = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const separator = line.indexOf(":");
    if (separator < 1) throw new Error(`Invalid frontmatter line in ${filePath}: ${line}`);
    metadata[line.slice(0, separator).trim()] = parseScalar(line.slice(separator + 1));
  }
  return { ...metadata, body: match[2].trim() };
}

function invalid(filePath, field, message) {
  throw new Error(`${filePath}: ${field} ${message}`);
}

function requireString(entry, field, filePath) {
  if (typeof entry[field] !== "string" || !entry[field].trim()) {
    invalid(filePath, field, "must be a non-empty string");
  }
}

function requireStringArray(entry, field, filePath) {
  if (!Array.isArray(entry[field]) || entry[field].some((value) => typeof value !== "string")) {
    invalid(filePath, field, "must be an array of strings");
  }
}

function validateOptionalString(entry, field, filePath) {
  if (entry[field] !== undefined) requireString(entry, field, filePath);
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function validateDate(entry, field, filePath) {
  requireString(entry, field, filePath);
  if (!isIsoDate(entry[field])) invalid(filePath, field, "must be an ISO YYYY-MM-DD date");
}

function validateEntry(entry, moduleName, filePath) {
  for (const field of ["title", "slug", "type", "summary", "status"]) {
    requireString(entry, field, filePath);
  }
  validateDate(entry, "date", filePath);
  if (entry.read_at !== undefined) validateDate(entry, "read_at", filePath);
  requireStringArray(entry, "tags", filePath);
  requireStringArray(entry, "related", filePath);

  if (!modules.includes(entry.type) || entry.type !== moduleName) {
    invalid(filePath, "type", `must match its ${moduleName} directory`);
  }
  if (!["draft", "published"].includes(entry.status)) {
    invalid(filePath, "status", "must be draft or published");
  }
  if (entry.type === "reflections" && entry.slug !== entry.date) {
    invalid(filePath, "slug", "must match the reflection date");
  }

  if (entry.type === "papers") {
    requireStringArray(entry, "authors", filePath);
    requireString(entry, "venue", filePath);
    if (!Number.isInteger(entry.year)) invalid(filePath, "year", "must be an integer");
    requireString(entry, "paper_url", filePath);
    try {
      const url = new URL(entry.paper_url);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("unsupported protocol");
    } catch {
      invalid(filePath, "paper_url", "must be an http or https URL");
    }
    requireString(entry, "reading_status", filePath);
    if (!readingStatuses.includes(entry.reading_status)) {
      invalid(filePath, "reading_status", `must be one of ${readingStatuses.join(", ")}`);
    }
    requireStringArray(entry, "reading_methods", filePath);
    for (const method of entry.reading_methods) {
      if (!readingMethods.includes(method)) {
        invalid(filePath, "reading_methods", `must contain only ${readingMethods.join(", ")}`);
      }
    }
    if (new Set(entry.reading_methods).size !== entry.reading_methods.length) {
      invalid(filePath, "reading_methods", "must not contain duplicate values");
    }
    if (entry.reading_status !== "queued" && entry.reading_methods.length === 0) {
      invalid(filePath, "reading_methods", "must contain at least one method after reading starts");
    }
    const bodyWithoutFences = entry.body.replace(/^(?:```|~~~)[^\n]*\r?\n[\s\S]*?^(?:```|~~~)\s*$/gm, "");
    for (const [method, section] of methodSections) {
      const declared = entry.reading_methods.includes(method);
      const present = new RegExp(`^##\\s+${section}\\s*$`, "m").test(bodyWithoutFences);
      if (declared && !present) invalid(filePath, "body", `must include ## ${section}`);
      if (present && !declared) invalid(filePath, "reading_methods", `must include ${method} for ## ${section}`);
    }
    requireStringArray(entry, "topics", filePath);
  }

  if (entry.type === "jobs") {
    requireString(entry, "company", filePath);
    requireString(entry, "role", filePath);
    requireString(entry, "application_stage", filePath);
    if (!applicationStages.includes(entry.application_stage)) {
      invalid(filePath, "application_stage", `must be one of ${applicationStages.join(", ")}`);
    }
    validateOptionalString(entry, "location", filePath);
    validateOptionalString(entry, "next_action", filePath);
    if (entry.applied_at !== undefined) validateDate(entry, "applied_at", filePath);
  }
}

function runtimeEntry(entry) {
  const {
    read_at: readAt,
    paper_url: paperUrl,
    reading_status: readingStatus,
    reading_methods: readingMethodsValue,
    application_stage: applicationStage,
    applied_at: appliedAt,
    next_action: nextAction,
    ...common
  } = entry;
  return {
    ...common,
    ...(readAt === undefined ? {} : { readAt }),
    ...(paperUrl === undefined ? {} : { paperUrl }),
    ...(readingStatus === undefined ? {} : { readingStatus }),
    ...(readingMethodsValue === undefined ? {} : { readingMethods: readingMethodsValue }),
    ...(applicationStage === undefined ? {} : { applicationStage }),
    ...(appliedAt === undefined ? {} : { appliedAt }),
    ...(nextAction === undefined ? {} : { nextAction }),
  };
}

async function collectEntries() {
  const entries = [];
  const slugSources = new Map();
  for (const moduleName of modules) {
    const directory = path.join(contentRoot, moduleName);
    const files = (await fs.readdir(directory)).filter((file) => file.endsWith(".md")).sort();
    const moduleEntries = [];
    for (const file of files) {
      const filePath = path.join(directory, file);
      const entry = parseMarkdown(await fs.readFile(filePath, "utf8"), filePath);
      validateEntry(entry, moduleName, filePath);
      if (slugSources.has(entry.slug)) {
        invalid(filePath, "slug", `is duplicate; first defined in ${slugSources.get(entry.slug).filePath}`);
      }
      const source = { entry, filePath };
      slugSources.set(entry.slug, source);
      moduleEntries.push(source);
    }
    if (moduleName === "reflections") {
      moduleEntries.sort((left, right) => right.entry.date.localeCompare(left.entry.date));
    }
    entries.push(...moduleEntries);
  }

  const publishedEntries = entries.filter(({ entry }) => entry.status === "published");
  for (const source of publishedEntries) {
    source.entry.related = source.entry.related.filter((relatedSlug) => {
      const target = slugSources.get(relatedSlug);
      if (!target) {
        console.warn(`${source.filePath}: related "${relatedSlug}" is unavailable; dropping relation.`);
        return false;
      }
      if (target.entry.status === "draft") {
        console.warn(`${source.filePath}: related "${relatedSlug}" targets draft content; dropping relation.`);
        return false;
      }
      return true;
    });
  }

  return publishedEntries.map(({ entry }) => runtimeEntry(entry));
}

const entries = await collectEntries();
const generated = `// Generated by scripts/generate-content-index.mjs. Do not edit.\nimport type { ContentEntry } from "./types";\n\nexport const CONTENT_ENTRIES: ContentEntry[] = ${JSON.stringify(entries, null, 2)};\n`;
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, generated, "utf8");
console.log(`Generated ${entries.length} content entries.`);
