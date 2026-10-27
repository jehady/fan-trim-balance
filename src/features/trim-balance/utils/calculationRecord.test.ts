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

  it("rejects persisted runs with duplicate, missing, or unexpected measurement rows", () => {
    const duplicateSpeed = persistedCalculation() as Record<string, unknown>;
    const run = duplicateSpeed.initialRun as { measurements: Array<Record<string, unknown>> };
    run.measurements[1].n1Speed = run.measurements[0].n1Speed;
    expect(restoreCalculation(duplicateSpeed)).toBeNull();

    const missingRow = persistedCalculation() as Record<string, unknown>;
    const missingRun = missingRow.secondRun as { measurements: unknown[] };
    missingRun.measurements.pop();
    expect(restoreCalculation(missingRow)).toBeNull();

    const unexpectedRow = persistedCalculation() as Record<string, unknown>;
    const extraRun = unexpectedRow.thirdRun as { measurements: unknown[] };
    extraRun.measurements.push({ n1Speed: "100", bearingVibration: 1, ffccvVibration: 1 });
    expect(restoreCalculation(unexpectedRow)).toBeNull();
  });

  it("rejects invalid limits and screw positions", () => {
    const invalidLimit = persistedCalculation() as Record<string, unknown>;
    invalidLimit.limits = { bearing: -1 };
    expect(restoreCalculation(invalidLimit)).toBeNull();

    const invalidPosition = persistedCalculation() as Record<string, unknown>;
    invalidPosition.testScrewPositions = { first: 0, second: 23, third: 11 };
    expect(restoreCalculation(invalidPosition)).toBeNull();
  });

  it("round-trips full-precision confirmed resultants", () => {
    const stored = persistedCalculation() as Record<string, unknown>;
    const selection = { x: 1.23456789012345, y: -0.000000123456789 };
    stored.selectedResultants = { A: selection, F: { x: 0.123456789012345, y: 9.87654321098765 } };
    const restored = restoreCalculation(stored);
    expect(restored?.selectedResultants).toEqual(stored.selectedResultants);
  });

  it("rejects non-finite persisted resultant data instead of accepting partial values", () => {
    const stored = persistedCalculation() as Record<string, unknown>;
    stored.selectedResultants = { A: { x: Number.NaN, y: 1 } };
    expect(restoreCalculation(stored)).toBeNull();

    stored.selectedResultants = { B: { x: Infinity, y: 1 } };
    expect(restoreCalculation(stored)).toBeNull();
  });

  it("normalizes legacy completion-status values for compatibility", () => {
    const legacyStatus = persistedCalculation() as Record<string, unknown>;
    legacyStatus.status = "Final Run Completed";
    expect(restoreCalculation(legacyStatus)?.status).toBe("In Progress");

    const legacyStepStatus = persistedCalculation() as Record<string, unknown>;
    legacyStepStatus.status = "Correction Calculated";
    expect(restoreCalculation(legacyStepStatus)?.status).toBe("In Progress");

    const oldCompleted = persistedCalculation() as Record<string, unknown>;
    oldCompleted.status = "Completed";
    expect(restoreCalculation(oldCompleted)?.status).toBe("In Progress");
  });

  it("loads legacy records without resultants or the newer configuration fields", () => {
    const stored = persistedCalculation() as Record<string, unknown>;
    delete stored.selectedResultants;
    const information = stored.information as Record<string, unknown>;
    delete information.aircraftType;
    delete information.aircraftEffectivity;
    information.id = "legacy-record-id";
    const initialRun = stored.initialRun as { measurements: Array<{ bearingVibration: number | null; ffccvVibration: number | null }> };
    initialRun.measurements[0].bearingVibration = 4.25;
    initialRun.measurements[0].ffccvVibration = 3.75;

    const restored = restoreCalculation(stored);
    expect(restored?.selectedResultants).toEqual({});
    expect(restored?.information.aircraftType).toBe("");
    expect(restored?.information.aircraftEffectivity).toBe("");
    expect(restored?.information.id).toBe("legacy-record-id");
    expect(restored?.initialRun.measurements[0]).toMatchObject({ bearingVibration: 4.25, ffccvVibration: 3.75 });
  });

  it("rejects malformed resultant selections instead of restoring them", () => {
    const malformedCoordinate = persistedCalculation() as Record<string, unknown>;
    malformedCoordinate.selectedResultants = { A: { x: "1.2", y: 3 } };
    expect(restoreCalculation(malformedCoordinate)).toBeNull();

    const malformedLabel = persistedCalculation() as Record<string, unknown>;
    malformedLabel.selectedResultants = { G: { x: 1, y: 2 } };
    expect(restoreCalculation(malformedLabel)).toBeNull();
  });

  it("rejects limit provenance that claims an unsupported verification status", () => {
    const stored = persistedCalculation() as Record<string, unknown>;
    stored.limitSources = { bearing: { documentTitle: "source", revisionOrDate: "date", effectivity: "effectivity", sectionOrFigure: "section", verificationStatus: "verified" } };
    expect(restoreCalculation(stored)).toBeNull();
  });
});
