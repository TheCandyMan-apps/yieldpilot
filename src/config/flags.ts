// Feature flags for conditional functionality

export const FLAGS = {
  enableUS: true,
  enableEU: true,
  enableFR: true,
  enableES: true,
  useFx: true,
  aiSummaries: true,
  showProvenance: true,
  enableApiKeys: true,
  enableAdvancedFilters: true,
} as const;

export type FlagKey = keyof typeof FLAGS;

export function isEnabled(flag: FlagKey): boolean {
  return FLAGS[flag] ?? false;
}
