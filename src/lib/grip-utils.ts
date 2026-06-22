// Grip data utilities (shared between server and client)

export interface GripData {
  name: string;
  size: string;
  weight: string;
  material: string;
  backline: string; // "有" | "無" | ""
}

const GRIP_ATTR_LABEL = "__grips__";
const GRIP_MASTER_LABEL = "__grip_names__";

export function serializeGrips(grips: GripData[]): { label: string; value: string } | null {
  if (grips.length === 0) return null;
  return { label: GRIP_ATTR_LABEL, value: JSON.stringify(grips) };
}

export function deserializeGrips(attrs: { label: string; value: string }[]): GripData[] {
  const entry = attrs.find((a) => a.label === GRIP_ATTR_LABEL);
  if (!entry) return [];
  try { return JSON.parse(entry.value); } catch { return []; }
}

export function serializeGripNames(names: string[]): { label: string; value: string } | null {
  if (names.length === 0) return null;
  return { label: GRIP_MASTER_LABEL, value: JSON.stringify(names) };
}

export function deserializeGripNames(attrs: { label: string; value: string }[]): string[] {
  const entry = attrs.find((a) => a.label === GRIP_MASTER_LABEL);
  if (!entry) return [];
  try { return JSON.parse(entry.value); } catch { return []; }
}

export function isGripAttr(label: string): boolean {
  return label === GRIP_ATTR_LABEL || label === GRIP_MASTER_LABEL;
}
