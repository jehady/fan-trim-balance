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

  it("does not claim PASS when configured thresholds have unverified sources", () => {
    const result = evaluateFinalRun(initialRun, finalRun(2.3, 2), { bearing: 3, ffccv: 3 });
    expect(result.status).toBe("NOT EVALUATED");
    expect(result.configuredThresholdResult).toBe("WITHIN CONFIGURED THRESHOLDS");
    expect(result.evaluationBlockers.join(" ")).toContain("unverified");
  });

  it("does not flag equality in software threshold screening but makes no compliance claim", () => {
    const result = evaluateFinalRun(initialRun, finalRun(3, 3), { bearing: 3, ffccv: 3 });
    expect(result.status).toBe("NOT EVALUATED");
    expect(result.exceededLimits).toEqual([]);
    expect(result.configuredThresholdResult).toBe("WITHIN CONFIGURED THRESHOLDS");
  });

  it("reports values above thresholds without claiming an unverified maintenance failure", () => {
    const result = evaluateFinalRun(initialRun, finalRun(3.1, 2), { bearing: 3, ffccv: 3 });
    expect(result.status).toBe("NOT EVALUATED");
    expect(result.exceededLimits).toContain("TO final N°1 Bearing");
    expect(result.configuredThresholdResult).toBe("EXCEEDS CONFIGURED THRESHOLDS");
  });

  it("calculates delta as final minus initial", () => {
    const row = buildFinalRunRows(initialRun, finalRun())[0];
    expect(row.deltaBearing).toBeCloseTo(-4.2);
  });

  it("uses final vibration, not delta, for configured-threshold screening", () => {
    const result = evaluateFinalRun(initialRun, finalRun(2.3, 2), { bearing: 3, ffccv: 3 });
    expect(result.rows[0].deltaBearing).toBeLessThan(0);
    expect(result.configuredThresholdResult).toBe("WITHIN CONFIGURED THRESHOLDS");
    expect(result.status).toBe("NOT EVALUATED");
  });
});
