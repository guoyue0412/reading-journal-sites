import type { BlogAsset } from "./asset-store.ts";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const formats = {
  "image/png": { extension: "png", matches: (b: Uint8Array) => [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((v, i) => b[i] === v) },
  "image/jpeg": { extension: "jpg", matches: (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/gif": { extension: "gif", matches: (b: Uint8Array) => new TextDecoder().decode(b.slice(0, 6)) === "GIF87a" || new TextDecoder().decode(b.slice(0, 6)) === "GIF89a" },
  "image/webp": { extension: "webp", matches: (b: Uint8Array) => new TextDecoder().decode(b.slice(0, 4)) === "RIFF" && new TextDecoder().decode(b.slice(8, 12)) === "WEBP" },
} as const;

export type SupportedImageType = keyof typeof formats;
export type ValidatedImage = { contentType: SupportedImageType; extension: string; safeName: string; sizeBytes: number; sha256: string };

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function validateImageFile(bytes: Uint8Array, claimedType: string, originalName: string): Promise<ValidatedImage> {
  const format = formats[claimedType as SupportedImageType];
  if (!format) throw new Error("不支持此图片格式");
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error("图片大小必须在 1 字节到 10MB 之间");
  if (!format.matches(bytes)) throw new Error("文件内容与格式不一致");
  const stem = originalName.replace(/\.[^.]+$/, "").normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "image";
  return {
    contentType: claimedType as SupportedImageType,
    extension: format.extension,
    safeName: `${stem}.${format.extension}`,
    sizeBytes: bytes.length,
    sha256: hex(await crypto.subtle.digest("SHA-256", bytes)),
  };
}

export function assetMarkdownUrl(asset: Pick<BlogAsset, "id" | "safeName">): string {
  return `/media/${asset.id}/${encodeURIComponent(asset.safeName)}`;
}
