import { describe, expect, it } from "vitest";
import { calculateBalanceWeight, calculateSensitivity } from "./balanceWeight";
import { buildPlotPoints } from "./buildPlotPoints";
import { calculatePairwiseAnalysis } from "./pairwiseAnalysis";
import { selectInitialPlotPoints } from "./selectPlotPoints";
import { validateEngineRun } from "../utils/validation";
import type { EngineRun } from "../types/trimBalance";

const initial: EngineRun = { measurements: [
  { n1Speed: "TO", bearingVibration: 6, ffccvVibration: 1 },
  { n1Speed: "93.7", bearingVibration: 5, ffccvVibration: 6 },
  { n1Speed: "85", bearingVibration: 4, ffccvVibration: 2 },
  { n1Speed: "81", bearingVibration: 3, ffccvVibration: 5 },
  { n1Speed: "66", bearingVibration: 2, ffccvVibration: 4 },
  { n1Speed: "54", bearingVibration: 1, ffccvVibration: 3 },
] };
const laterRun: EngineRun = { measurements: initial.measurements.map((item) => ({ ...item, bearingVibration: item.bearingVibration + 1, ffccvVibration: item.ffccvVibration + 1 })) };

describe("workflow calculation primitives", () => {
  it("reports missing and invalid N1 measurements", () => {
    expect(validateEngineRun({ measurements: [{ n1Speed: "TO", bearingVibration: -1, ffccvVibration: Number.NaN }] }, "Initial")).toHaveLength(7);
  });

  it("selects the top three initial amplitudes for each sensor", () => {
    expect(selectInitialPlotPoints(initial).map((point) => point.n1Speed)).toEqual(["TO", "93.7", "85", "93.7", "81", "66"]);
  });

  it("extracts labelled A–F data using the same N1 point from every run", () => {
    const points = buildPlotPoints(initial, laterRun, laterRun, laterRun);
    expect(points.map((point) => point.label)).toEqual(["A", "B", "C", "D", "E", "F"]);
    expect(points[0]).toMatchObject({ n1Speed: "TO", initialVibration: 6, firstVibration: 7 });
    expect(points[3]).toMatchObject({ sensor: "ffccv", n1Speed: "93.7", initialVibration: 6, thirdVibration: 7 });
  });

  it("calculates W6 and sensitivity from the documented constants", () => {
    expect(calculateBalanceWeight(6.5, 2.7)).toBeCloseTo(2002, 0);
    expect(calculateSensitivity(2.7)).toBeCloseTo(308, 0);
  });

  it("calculates pairwise distance, combined sensitivity, and U", () => {
    const result = calculatePairwiseAnalysis([
      { label: "A", point: { x: 0, y: 0 }, sensitivity: 10 },
      { label: "B", point: { x: 30, y: 40 }, sensitivity: 15 },
    ]);
    expect(result).toEqual([{ pair: "AB", distanceCmG: 50, combinedSensitivity: 25, amplitude: 2 }]);
  });
});
