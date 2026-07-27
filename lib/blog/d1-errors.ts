import { SlugConflictError } from "./store.ts";

function isPostsSlugConstraint(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 4; depth += 1) {
    const message = current instanceof Error ? current.message : String(current);
    const namesSlugColumn = /unique constraint failed:\s*posts\.slug(?:\s*:|\s*$)/i.test(message);
    const namesSlugIndex = /\bposts_slug_uq\b/i.test(message);
    if (namesSlugColumn || namesSlugIndex) {
      return true;
    }
    current = current instanceof Error ? current.cause : null;
  }
  return false;
}

export function mapD1WriteError(error: unknown): unknown {
  return isPostsSlugConstraint(error) ? new SlugConflictError() : error;
}
