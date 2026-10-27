import type { TrimBalanceCalculation } from "../types/trimBalance";

export type ReportPersistenceState = "live-draft" | "saved-record" | "unsaved-edits";

export function reportPersistenceState(
  current: TrimBalanceCalculation,
  persistedSnapshot: TrimBalanceCalculation | null
): ReportPersistenceState {
  if (!persistedSnapshot) {
    return "live-draft";
  }
  return JSON.stringify(current) === JSON.stringify(persistedSnapshot)
    ? "saved-record"
    : "unsaved-edits";
}
