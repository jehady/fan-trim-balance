import { describe, expect, it } from "vitest";
import { createCalculation, restoreCalculation } from "./calculationRecord";

function persistedCalculation() {
  return JSON.parse(JSON.stringify(createCalculation())) as unknown;
}

describe("calculation record persistence", () => {
  it("restores a valid persisted calculation with blank measurements", () => {
    const restored = restoreCalculation(persistedCalculation());

    expect(restored).not.toBeNull();
    expect(restored?.testScrewPositions).toEqual({ first: 35, second: 23, third: 11 });
    expect(Number.isNaN(restored?.initialRun.measurements[0].bearingVibration)).toBe(true);
  });

  it("rejects malformed nested persisted data", () => {
    const stored = persistedCalculation() as Record<string, unknown>;
    const information = stored.information as Record<string, unknown>;
    information.engineModel = 7;

    expect(restoreCalculation(stored)).toBeNull();
  });

  it("rejects invalid limits and screw positions", () => {
    const invalidLimit = persistedCalculation() as Record<string, unknown>;
    invalidLimit.limits = { bearing: -1 };
    expect(restoreCalculation(invalidLimit)).toBeNull();

    const invalidPosition = persistedCalculation() as Record<string, unknown>;
    invalidPosition.testScrewPositions = { first: 0, second: 23, third: 11 };
    expect(restoreCalculation(invalidPosition)).toBeNull();
  });
});
