import { restoreCalculation, storageKey } from "./calculationRecord";
import type { TrimBalanceCalculation } from "../types/trimBalance";

export interface CalculationStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type SavedCalculationsRead =
  | { ok: true; calculations: TrimBalanceCalculation[] }
  | { ok: false; calculations: TrimBalanceCalculation[]; error: string };

export type SaveCalculationResult =
  | { ok: true; calculations: TrimBalanceCalculation[]; alreadyPersisted?: boolean }
  | { ok: false; error: string };

export function loadSavedCalculations(storage?: CalculationStorage): SavedCalculationsRead {
  let activeStorage: CalculationStorage;
  try {
    activeStorage = storage ?? globalThis.localStorage;
  } catch (error) {
    return { ok: false, calculations: [], error: `Saved calculations could not be safely loaded: ${errorMessage(error)}` };
  }

  let raw: string | null;
  try {
    raw = activeStorage.getItem(storageKey);
  } catch (error) {
    return { ok: false, calculations: [], error: `Saved calculations could not be safely loaded: ${errorMessage(error)}` };
  }

  if (raw === null) {
    return { ok: true, calculations: [] };
  }

  let stored: unknown;
  try {
    stored = JSON.parse(raw);
  } catch (error) {
    return { ok: false, calculations: [], error: `Saved calculations contain malformed JSON and were not overwritten: ${errorMessage(error)}` };
  }
  if (!Array.isArray(stored)) {
    return { ok: false, calculations: [], error: "Saved browser data is not a calculation list and was not overwritten." };
  }

  const restored = stored.map(restoreCalculation);
  const calculations = restored.filter((item): item is TrimBalanceCalculation => item !== null);
  if (calculations.length !== restored.length) {
    return {
      ok: false,
      calculations,
      error: "One or more saved records are malformed or unsupported. They were not overwritten.",
    };
  }

  const ids = calculations.map((item) => item.information.id);
  if (new Set(ids).size !== ids.length) {
    return {
      ok: false,
      calculations,
      error: "Saved records contain duplicate calculation IDs. They were not overwritten.",
    };
  }

  return { ok: true, calculations };
}

export function saveCalculation(
  calculation: TrimBalanceCalculation,
  expectedExisting: TrimBalanceCalculation | null,
  storage?: CalculationStorage
): SaveCalculationResult {
  let activeStorage: CalculationStorage;
  try {
    activeStorage = storage ?? globalThis.localStorage;
  } catch (error) {
    return {
      ok: false,
      error: `Saved calculations could not be safely accessed: ${errorMessage(error)} This calculation remains available in memory; no save was performed.`,
    };
  }

  const read = loadSavedCalculations(activeStorage);
  if (!read.ok) {
    return {
      ok: false,
      error: `${read.error} This calculation remains available in memory; no save was performed.`,
    };
  }

  const existing = read.calculations.find((item) => item.information.id === calculation.information.id);
  if (existing && sameRecord(existing, calculation)) {
    return { ok: true, calculations: read.calculations, alreadyPersisted: true };
  }
  if (existing && (!expectedExisting || !sameRecord(existing, expectedExisting))) {
    return {
      ok: false,
      error: `Calculation ID ${calculation.information.id} already belongs to a different saved record. No record was overwritten.`,
    };
  }
  if (!existing && expectedExisting) {
    return {
      ok: false,
      error: `The previously saved record ${calculation.information.id} is no longer present. No record was written.`,
    };
  }

  const calculations = existing
    ? read.calculations.map((item) => item.information.id === calculation.information.id ? calculation : item)
    : [calculation, ...read.calculations];

  try {
    activeStorage.setItem(storageKey, JSON.stringify(calculations));
    return { ok: true, calculations };
  } catch (error) {
    return {
      ok: false,
      error: `Calculation changes could not be saved: ${errorMessage(error)}. The in-memory calculation remains available, but persistence was not confirmed.`,
    };
  }
}

function sameRecord(first: TrimBalanceCalculation, second: TrimBalanceCalculation): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown storage error";
}
