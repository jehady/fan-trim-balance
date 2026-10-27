import { describe, expect, it } from "vitest";
import { createCalculation } from "./calculationRecord";
import { loadSavedCalculations, saveCalculation, type CalculationStorage } from "./storage";
import { N1_SPEEDS } from "../types/trimBalance";

function mockStorage(initialValue: string | null = null) {
  let value = initialValue;
  let readError = false;
  let writeError = false;
  let writes = 0;
  const storage: CalculationStorage = {
    getItem: () => {
      if (readError) throw new Error("read denied");
      return value;
    },
    setItem: (_key, nextValue) => {
      writes += 1;
      if (writeError) throw new Error("quota exceeded");
      value = nextValue;
    },
  };
  return {
    storage,
    get value() { return value; },
    get writes() { return writes; },
    setReadError(value: boolean) { readError = value; },
    setWriteError(value: boolean) { writeError = value; },
  };
}

describe("safe calculation persistence", () => {
  it("distinguishes a successful empty read from storage read failure", () => {
    const empty = loadSavedCalculations(mockStorage().storage);
    expect(empty).toEqual({ ok: true, calculations: [] });

    const storage = mockStorage();
    storage.setReadError(true);
    expect(loadSavedCalculations(storage.storage)).toMatchObject({
      ok: false,
      calculations: [],
      error: expect.stringContaining("could not be safely loaded"),
    });
  });

  it("preserves malformed JSON and blocks writes until it can be recovered", () => {
    const original = "{not valid JSON";
    const storage = mockStorage(original);
    expect(loadSavedCalculations(storage.storage)).toMatchObject({
      ok: false,
      error: expect.stringContaining("malformed JSON"),
    });
    expect(saveCalculation(createCalculation(), null, storage.storage)).toMatchObject({
      ok: false,
      error: expect.stringContaining("malformed JSON"),
    });
    expect(storage.value).toBe(original);
    expect(storage.writes).toBe(0);
  });

  it("handles exceptions thrown while resolving browser localStorage", () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("storage access denied");
      },
    });
    try {
      expect(loadSavedCalculations()).toMatchObject({
        ok: false,
        error: expect.stringContaining("storage access denied"),
      });
      expect(saveCalculation(createCalculation(), null)).toMatchObject({
        ok: false,
        error: expect.stringContaining("storage access denied"),
      });
    } finally {
      if (previous) {
        Object.defineProperty(globalThis, "localStorage", previous);
      } else {
        Reflect.deleteProperty(globalThis, "localStorage");
      }
    }
  });

  it("does not write after a read failure and keeps the calculation available to the caller", () => {
    const storage = mockStorage(JSON.stringify([{ id: "existing" }]));
    storage.setReadError(true);
    const calculation = createCalculation();
    const result = saveCalculation(calculation, null, storage.storage);
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("no save was performed") });
    expect(storage.writes).toBe(0);
    expect(calculation.information.id).toBeTruthy();
  });

  it("does not overwrite malformed saved records that cannot be restored", () => {
    const malformed = createCalculation();
    malformed.initialRun.measurements[1].n1Speed = malformed.initialRun.measurements[0].n1Speed;
    const original = JSON.stringify([malformed]);
    const storage = mockStorage(original);
    const result = saveCalculation(createCalculation(), null, storage.storage);
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("malformed or unsupported") });
    expect(storage.value).toBe(original);
    expect(storage.writes).toBe(0);
  });

  it("allows a safe retry after reads recover", () => {
    const storage = mockStorage();
    storage.setReadError(true);
    expect(saveCalculation(createCalculation(), null, storage.storage).ok).toBe(false);
    storage.setReadError(false);
    const calculation = createCalculation();
    const result = saveCalculation(calculation, null, storage.storage);
    expect(result.ok).toBe(true);
    expect(loadSavedCalculations(storage.storage)).toMatchObject({ ok: true, calculations: [calculation] });
  });

  it("leaves existing saved data unchanged when a write fails", () => {
    const existing = createCalculation();
    const storage = mockStorage(JSON.stringify([existing]));
    const original = storage.value;
    storage.setWriteError(true);
    const next = createCalculation();
    expect(saveCalculation(next, null, storage.storage)).toMatchObject({
      ok: false,
      error: expect.stringContaining("quota exceeded"),
    });
    expect(storage.value).toBe(original);
    expect(storage.writes).toBe(1);
  });

  it("creates distinct same-day IDs and preserves both records after save and reload", () => {
    const date = new Date("2026-10-27T09:00:00.000Z");
    const first = createCalculation(date);
    const second = createCalculation(date);
    expect(first.information.id).not.toBe(second.information.id);

    const storage = mockStorage();
    expect(saveCalculation(first, null, storage.storage).ok).toBe(true);
    expect(saveCalculation(second, null, storage.storage).ok).toBe(true);
    const loaded = loadSavedCalculations(storage.storage);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.calculations.map((item) => item.information.id)).toEqual([second.information.id, first.information.id]);
    }
  });

  it("preserves original data through consecutive independent saves", () => {
    const storage = mockStorage();
    const first = createCalculation();
    first.information.notes = "first record";
    const second = createCalculation();
    second.information.notes = "second record";

    expect(saveCalculation(first, null, storage.storage).ok).toBe(true);
    expect(saveCalculation(second, null, storage.storage).ok).toBe(true);

    const loaded = loadSavedCalculations(storage.storage);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.calculations.map(({ information }) => information.notes).sort()).toEqual(["first record", "second record"]);
    }
  });

  it("rejects an ID collision rather than replacing another calculation", () => {
    const existing = createCalculation();
    const storage = mockStorage(JSON.stringify([existing]));
    const collision = createCalculation();
    collision.information.id = existing.information.id;
    collision.information.notes = "different record";
    const result = saveCalculation(collision, null, storage.storage);
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("already belongs to a different") });
    expect(JSON.parse(storage.value ?? "[]")[0].information.notes).toBe(existing.information.notes);
    expect(storage.writes).toBe(0);
  });

  it("saving blank and partial calculations persists them without marking workflow completion", () => {
    const storage = mockStorage();
    const blank = createCalculation();
    const partial = createCalculation();
    partial.status = "In Progress";
    partial.initialRun.measurements = N1_SPEEDS.map((n1Speed) => ({ n1Speed, bearingVibration: 1, ffccvVibration: 1 }));

    expect(saveCalculation(blank, null, storage.storage)).toMatchObject({ ok: true });
    expect(blank.status).toBe("Draft");
    const afterBlank = loadSavedCalculations(storage.storage);
    expect(afterBlank.ok && afterBlank.calculations[0].status).toBe("Draft");

    expect(saveCalculation(partial, null, storage.storage)).toMatchObject({ ok: true });
    const afterPartial = loadSavedCalculations(storage.storage);
    expect(afterPartial.ok && afterPartial.calculations.find((item) => item.information.id === partial.information.id)?.status).toBe("In Progress");
  });

  it("preserves workflow status for correction-only and final-run data", () => {
    const storage = mockStorage();
    const correctionOnly = createCalculation();
    correctionOnly.status = "In Progress";
    correctionOnly.selectedResultants = { A: { x: 1, y: 1 } };
    const finalRunData = createCalculation();
    finalRunData.status = "In Progress";
    finalRunData.finalRun.measurements = N1_SPEEDS.map((n1Speed) => ({ n1Speed, bearingVibration: 2, ffccvVibration: 3 }));

    expect(saveCalculation(correctionOnly, null, storage.storage).ok).toBe(true);
    expect(saveCalculation(finalRunData, null, storage.storage).ok).toBe(true);
    const loaded = loadSavedCalculations(storage.storage);
    expect(loaded.ok && loaded.calculations.every((item) => item.status === "In Progress")).toBe(true);
  });
});
