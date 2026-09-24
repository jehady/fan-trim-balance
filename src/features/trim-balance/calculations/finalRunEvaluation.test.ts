import { describe, expect, it } from "vitest";
import { buildFinalRunRows, evaluateFinalRun } from "./finalRunEvaluation";
import type { EngineRun } from "../types/trimBalance";

const initialRun: EngineRun = {
  measurements: [
    { n1Speed: "TO", bearingVibration: 6.5, ffccvVibration: 3 },
    { n1Speed: "93.7", bearingVibration: 4, ffccvVibration: 3 },
    { n1Speed: "85", bearingVibration: 4, ffccvVibration: 3 },
    { n1Speed: "81", bearingVibration: 4, ffccvVibration: 3 },
    { n1Speed: "66", bearingVibration: 4, ffccvVibration: 3 },
    { n1Speed: "54", bearingVibration: 4, ffccvVibration: 3 },
  ],
};

function finalRun(bearing: number | null = 2.3, ffccv = 2): EngineRun {
  return { measurements: initialRun.measurements.map((measurement) => ({ ...measurement, bearingVibration: measurement.n1Speed === "TO" ? bearing ?? Number.NaN : 2, ffccvVibration: ffccv })) };
}

describe("final run evaluation", () => {
  it("returns NOT EVALUATED when limits are missing", () => {
    expect(evaluateFinalRun(initialRun, finalRun(), {}).status).toBe("NOT EVALUATED");
  });

  it("returns NOT EVALUATED when a required final measurement is missing", () => {
    const result = evaluateFinalRun(initialRun, finalRun(null), { bearing: 3, ffccv: 3 });
    expect(result.status).toBe("NOT EVALUATED");
    expect(result.missingMeasurements).toContain("TO final N°1 Bearing");
  });

  it("returns PASS when final values are below configured limits", () => {
    expect(evaluateFinalRun(initialRun, finalRun(2.3, 2), { bearing: 3, ffccv: 3 }).status).toBe("PASS");
  });

  it("returns PASS when final values equal configured limits", () => {
    expect(evaluateFinalRun(initialRun, finalRun(3, 3), { bearing: 3, ffccv: 3 }).status).toBe("PASS");
  });

  it("returns FAIL when a final value exceeds its configured limit", () => {
    expect(evaluateFinalRun(initialRun, finalRun(3.1, 2), { bearing: 3, ffccv: 3 }).status).toBe("FAIL");
  });

  it("calculates delta as final minus initial", () => {
    const row = buildFinalRunRows(initialRun, finalRun())[0];
    expect(row.deltaBearing).toBeCloseTo(-4.2);
  });

  it("uses final vibration, not delta, for pass/fail", () => {
    const result = evaluateFinalRun(initialRun, finalRun(2.3, 2), { bearing: 3, ffccv: 3 });
    expect(result.rows[0].deltaBearing).toBeLessThan(0);
    expect(result.status).toBe("PASS");
  });
});
