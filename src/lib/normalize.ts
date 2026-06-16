/**
 * Normalize club maker/model names for cache lookup.
 * Handles: full-width→half-width, case folding, whitespace removal, hyphen unification.
 * Does NOT handle: katakana↔English mapping (intentional — see spec).
 */
export function normalizeClubName(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[ー−‐]/g, "-");
}
