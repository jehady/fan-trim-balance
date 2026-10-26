import { restoreCalculation, storageKey } from "./calculationRecord";
import type { TrimBalanceCalculation } from "../types/trimBalance";

export function loadSavedCalculations(): { calculations: TrimBalanceCalculation[]; warning?: string } {
  try {
    const raw = localStorage.getItem(storageKey);
    const stored: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(stored)) {
      return { calculations: [], warning: "Saved browser data is not a calculation list; it was left unchanged and not loaded." };
    }
    const restored = stored.map(restoreCalculation);
    const calculations = restored.filter((item): item is TrimBalanceCalculation => item !== null);
    const rejectedCount = restored.length - calculations.length;
    return {
      calculations,
      warning: rejectedCount ? `${rejectedCount} malformed or unsupported saved calculation(s) were rejected; the stored data was left unchanged until you explicitly save.` : undefined,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown storage error";
    return { calculations: [], warning: `Saved browser data could not be read: ${detail}. It was not overwritten.` };
  }
}

export function persistSavedCalculations(calculations: TrimBalanceCalculation[]): { ok: true } | { ok: false; error: string } {
  try {
    localStorage.setItem(storageKey, JSON.stringify(calculations));
    return { ok: true };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown storage error";
    return { ok: false, error: detail };
  }
}
