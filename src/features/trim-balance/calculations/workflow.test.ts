import { describe, expect, it } from "vitest";
import { calculateBalanceWeight, calculateSensitivity } from "./balanceWeight";
import { buildPlotPoints } from "./buildPlotPoints";
import type { PairwiseAnalysis } from "./pairwiseAnalysis";
import { calculateSelectedPairwiseAnalysis, calculateSelectedResultMetrics, storeSelectedResultant, validateAllSelectedResultants, validateSelectedResultants, type SelectedResultants } from "./selectedResultants";
import { calculateFinalCorrection } from "./finalCorrection";
import { findPlotPointCutoffTies, selectInitialPlotPoints } from "./selectPlotPoints";
import { TEST_SCREW_SPACING_ERROR, testScrewSpacingWarning, validateEngineRun, validateTestScrewSpacing, validateThreeShotInput } from "../utils/validation";
import { exampleInput } from "../utils/testData";
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
const labels = ["A", "B", "C", "D", "E", "F"] as const;
function workflowFixture() {
  const points = labels.map((label, index) => ({
    label,
    sensor: index < 3 ? "bearing" as const : "ffccv" as const,
    n1Speed: (["TO", "93.7", "85", "93.7", "81", "66"] as const)[index],
    initialVibration: 10,
    firstVibration: 20,
    secondVibration: 20,
    thirdVibration: 20,
  }));
  const testScrewPositions = { first: 35, second: 23, third: 11 };
  const selections = labels.reduce((current, label, index) =>
    storeSelectedResultant(current, label, { x: index + 1, y: index + 2 }), {} as SelectedResultants);
  return { points, testScrewPositions, selections };
}

describe("workflow calculation primitives", () => {
  it.each([0, 1, 2, 3, 4, 5])("does not authorize final correction with %i confirmed resultants", (count) => {
    const { points, testScrewPositions } = workflowFixture();
    const selections = points.slice(0, count).reduce(
      (current, point) => storeSelectedResultant(current, point.label, { x: 1, y: 1 }),
      {} as SelectedResultants
    );
    expect(validateAllSelectedResultants(points, selections, testScrewPositions)).toBe(false);
  });

  it("authorizes complete correction only when all six resultants are valid", () => {
    const { points, testScrewPositions, selections } = workflowFixture();
    expect(validateAllSelectedResultants(points, selections, testScrewPositions)).toBe(true);
  });

  it("reports missing and invalid N1 measurements", () => {
    expect(validateEngineRun({ measurements: [{ n1Speed: "TO", bearingVibration: -1, ffccvVibration: Number.NaN }] }, "Initial")).toHaveLength(8);
  });

  it("selects the top three initial amplitudes for each sensor", () => {
    expect(selectInitialPlotPoints(initial).map((point) => point.n1Speed)).toEqual(["TO", "93.7", "85", "93.7", "81", "66"]);
  });

  it("reports cutoff ties without inventing a tie-breaking rule", () => {
    const tiedInput = {
      measurements: initial.measurements.map((measurement) =>
        measurement.n1Speed === "81" ? { ...measurement, bearingVibration: 4 } : measurement
      ),
    };
    expect(findPlotPointCutoffTies(tiedInput)).toEqual([
      { sensor: "bearing", vibration: 4, speeds: ["85", "81"] },
    ]);
    expect(selectInitialPlotPoints(tiedInput).slice(0, 3).map(({ n1Speed }) => n1Speed)).toEqual(["TO", "93.7", "85"]);
    expect(selectInitialPlotPoints({ measurements: [...tiedInput.measurements].reverse() }).slice(0, 3).map(({ n1Speed }) => n1Speed)).toEqual(["TO", "93.7", "85"]);

    const nonCutoffTie = {
      measurements: initial.measurements.map((measurement) =>
        measurement.n1Speed === "93.7" ? { ...measurement, bearingVibration: 6 } : measurement
      ),
    };
    expect(findPlotPointCutoffTies(nonCutoffTie)).toEqual([]);
  });

  it("warns when recorded test positions do not match equally spaced 120-degree positions", () => {
    expect(testScrewSpacingWarning({ first: 35, second: 23, third: 11 })).toBeUndefined();
    expect(testScrewSpacingWarning({ first: 1, second: 13, third: 25 })).toBeUndefined();
    expect(testScrewSpacingWarning({ first: 35, second: 23, third: 10 })).toContain(TEST_SCREW_SPACING_ERROR);
  });

  it.each([
    [{ first: 35, second: 23, third: 11 }, true],
    [{ first: 35, second: 23, third: 12 }, false],
    [{ first: 1, second: 13, third: 25 }, true],
    [{ first: 1, second: 25, third: 13 }, true],
  ] as const)("validates 120-degree test-position spacing for %j", (positions, valid) => {
    expect(validateTestScrewSpacing(positions)).toBe(valid ? undefined : TEST_SCREW_SPACING_ERROR);
    const errors = validateThreeShotInput({ ...exampleInput, testScrewPositions: positions });
    expect(errors.includes(TEST_SCREW_SPACING_ERROR)).toBe(!valid);
  });

  it("rejects unspaced positions at the selected-resultant calculation boundary", () => {
    const { points, selections } = workflowFixture();
    const validation = validateSelectedResultants(points, selections, { first: 35, second: 23, third: 12 });
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain(TEST_SCREW_SPACING_ERROR);
  });

  it("labels the three highest initial amplitudes independently for each sensor", () => {
    const points = buildPlotPoints(initial, laterRun, laterRun, laterRun);
    expect(points.map((point) => point.label)).toEqual(["A", "B", "C", "D", "E", "F"]);
    expect(points.map((point) => point.n1Speed)).toEqual(["TO", "93.7", "85", "93.7", "81", "66"]);
    expect(points.slice(0, 3).every((point) => point.sensor === "bearing")).toBe(true);
    expect(points.slice(3).every((point) => point.sensor === "ffccv")).toBe(true);
    expect(points[0]).toMatchObject({ n1Speed: "TO", initialVibration: 6, firstVibration: 7, secondVibration: 7, thirdVibration: 7 });
    expect(points[3]).toMatchObject({ sensor: "ffccv", n1Speed: "93.7", initialVibration: 6, firstVibration: 7, secondVibration: 7, thirdVibration: 7 });
  });

  it("calculates W6 and sensitivity from the documented constants", () => {
    expect(calculateBalanceWeight(6.5, 2.7)).toBeCloseTo(2002, 0);
    expect(calculateSensitivity(2.7)).toBeCloseTo(308, 0);
  });

  it("calculates pairwise distance, combined sensitivity, and U from validated selections", () => {
    const { points, testScrewPositions, selections } = workflowFixture();
    const result = calculateSelectedPairwiseAnalysis(points, selections, testScrewPositions);
    const pair = result.find((item) => item.pair === "AB");
    const firstMetrics = calculateSelectedResultMetrics(points[0], selections.A)!;
    const secondMetrics = calculateSelectedResultMetrics(points[1], selections.B)!;
    const expectedDistance = Math.hypot(
      firstMetrics.w6CmG * Math.sin(firstMetrics.resultantAngleDeg * Math.PI / 180) - secondMetrics.w6CmG * Math.sin(secondMetrics.resultantAngleDeg * Math.PI / 180),
      firstMetrics.w6CmG * Math.cos(firstMetrics.resultantAngleDeg * Math.PI / 180) - secondMetrics.w6CmG * Math.cos(secondMetrics.resultantAngleDeg * Math.PI / 180)
    );
    expect(pair?.distanceCmG).toBeCloseTo(expectedDistance);
    expect(pair?.combinedSensitivity).toBeCloseTo(firstMetrics.sensitivity + secondMetrics.sensitivity);
    expect(pair?.amplitude).toBeCloseTo(expectedDistance / (firstMetrics.sensitivity + secondMetrics.sensitivity));
    expect(result).toHaveLength(15);
  });

  it("stores each A-F selection and uses the confirmed selections for Step 8", () => {
    const points = buildPlotPoints(initial, laterRun, laterRun, laterRun);
    let selections: SelectedResultants = {};
    const pointA = { x: 0.25, y: 2.59 };
    const pointB = { x: 1.35, y: 1.86 };

    selections = storeSelectedResultant(selections, "A", pointA);
    selections = storeSelectedResultant(selections, "B", pointB);

    expect(selections).toEqual({ A: pointA, B: pointB });
    expect(calculateSelectedResultMetrics(points[0], selections.A)).toMatchObject({ resultantPoint: pointA });
    expect(calculateSelectedResultMetrics(points[1], selections.B)).toMatchObject({ resultantPoint: pointB });
    expect(calculateSelectedResultMetrics(points[2], selections.C)).toBeUndefined();
  });

  it("changes Step 8 pairwise results when a confirmed A-F selection changes", () => {
    const { points, testScrewPositions, selections: firstSelections } = workflowFixture();
    const changedSelections = storeSelectedResultant(firstSelections, "A", { x: 2, y: 2 });
    const firstPairwise = calculateSelectedPairwiseAnalysis(points, firstSelections, testScrewPositions);
    const changedPairwise = calculateSelectedPairwiseAnalysis(points, changedSelections, testScrewPositions);

    expect(changedPairwise.find((pair) => pair.pair === "AB")?.distanceCmG).not.toBe(firstPairwise.find((pair) => pair.pair === "AB")?.distanceCmG);
    expect(changedPairwise.find((pair) => pair.pair === "AB")?.combinedSensitivity).not.toBe(firstPairwise.find((pair) => pair.pair === "AB")?.combinedSensitivity);
  });

  it("does not use automatic/reference geometry when user selections are valid", () => {
    const { points, testScrewPositions, selections } = workflowFixture();
    const pairwise = calculateSelectedPairwiseAnalysis(points, selections, testScrewPositions);
    const pointA = calculateSelectedResultMetrics(points[0], selections.A);
    const pointB = calculateSelectedResultMetrics(points[1], selections.B);
    const expectedDistance = Math.hypot(pointA!.w6CmG * Math.sin(pointA!.resultantAngleDeg * Math.PI / 180) - pointB!.w6CmG * Math.sin(pointB!.resultantAngleDeg * Math.PI / 180), pointA!.w6CmG * Math.cos(pointA!.resultantAngleDeg * Math.PI / 180) - pointB!.w6CmG * Math.cos(pointB!.resultantAngleDeg * Math.PI / 180));

    expect(pairwise.find((pair) => pair.pair === "AB")?.distanceCmG).toBeCloseTo(expectedDistance);
    expect(pairwise).toHaveLength(15);
  });

  it("uses current validated A-F selections for final correction", () => {
    const { points, testScrewPositions, selections } = workflowFixture();
    const firstResult = calculateFinalCorrection(points, selections, testScrewPositions);
    const changedSelections = storeSelectedResultant(selections, "A", { x: 2, y: 2 });
    const changedResult = calculateFinalCorrection(points, changedSelections, testScrewPositions);

    expect(Number.isFinite(firstResult.finalWeightCmG)).toBe(true);
    expect(changedResult.finalWeightCmG).not.toBe(firstResult.finalWeightCmG);
  });

  it.each([
    ["only A and B", (selections: SelectedResultants) => ({ A: selections.A, B: selections.B })],
    ["five resultants", (selections: SelectedResultants) => Object.fromEntries(labels.slice(0, 5).map((label) => [label, selections[label]])) as SelectedResultants],
    ["missing label", (selections: SelectedResultants) => ({ A: selections.A, B: selections.B, C: selections.C, D: selections.D, E: selections.E })],
    ["unexpected label", (selections: SelectedResultants) => ({ ...selections, G: { x: 1, y: 2 } } as SelectedResultants)],
  ])("rejects %s at the final-correction boundary", (_name, selectionsFor) => {
    const { points, testScrewPositions, selections } = workflowFixture();
    expect(() => calculateFinalCorrection(points, selectionsFor(selections), testScrewPositions)).toThrow();
  });

  it("rejects duplicate source labels and non-finite or invalid selected coordinates", () => {
    const { points, testScrewPositions, selections } = workflowFixture();
    const duplicatePoints = [...points.slice(0, 5), { ...points[5], label: "A" as const }];
    expect(() => calculateSelectedPairwiseAnalysis(duplicatePoints, selections, testScrewPositions)).toThrow(/exactly one point/);
    expect(() => calculateFinalCorrection(points, { ...selections, A: { x: Number.NaN, y: 1 } }, testScrewPositions)).toThrow(/finite|not finite/i);
    expect(() => calculateFinalCorrection(points, { ...selections, A: { x: Infinity, y: 1 } }, testScrewPositions)).toThrow(/finite|not finite/i);
    expect(() => calculateFinalCorrection(points, { ...selections, A: { x: 0, y: 0 } }, testScrewPositions)).toThrow(/zero|close to zero/i);
  });

  it("rejects duplicated or incorrectly assigned A-F source measurements", () => {
    const { points, testScrewPositions, selections } = workflowFixture();
    const duplicateSource = [...points];
    duplicateSource[1] = { ...duplicateSource[1], n1Speed: duplicateSource[0].n1Speed };
    expect(() => calculateFinalCorrection(duplicateSource, selections, testScrewPositions)).toThrow(/unique.*sensor and N1-speed/i);
    const wrongSensor = [...points];
    wrongSensor[0] = { ...wrongSensor[0], sensor: "ffccv" };
    expect(() => calculateFinalCorrection(wrongSensor, selections, testScrewPositions)).toThrow(/correctly assigned/i);
  });

  it("returns explicit validation failures for structurally malformed API inputs", () => {
    const { points, testScrewPositions, selections } = workflowFixture();
    expect(() => calculateFinalCorrection(points, null as unknown as SelectedResultants, testScrewPositions)).toThrow(/missing or malformed/i);
    expect(() => calculateFinalCorrection(points, selections, null as unknown as typeof testScrewPositions)).toThrow(/missing or malformed/i);
    expect(() => calculateFinalCorrection([null] as unknown as typeof points, selections, testScrewPositions)).toThrow(/plot point data.*malformed/i);
    expect(() => calculateFinalCorrection(new Array(6) as typeof points, selections, testScrewPositions)).toThrow(/plot point data.*malformed/i);
    expect(() => calculateFinalCorrection(points, { ...selections, A: null as unknown as { x: number; y: number } }, testScrewPositions)).toThrow(/coordinates must be finite/i);
  });

  it("rejects stale selections after source geometry changes", () => {
    const { points, testScrewPositions, selections } = workflowFixture();
    points[0] = { ...points[0], firstVibration: 0 };
    expect(() => calculateFinalCorrection(points, selections, testScrewPositions)).toThrow(/A:/);
  });

  it("rejects malformed source measurements at the calculation boundary", () => {
    const { points, testScrewPositions, selections } = workflowFixture();
    points[0] = { ...points[0], secondVibration: Number.NaN };
    expect(() => calculateFinalCorrection(points, selections, testScrewPositions)).toThrow(/A: current source measurements are invalid/);
  });

  it("rejects pair values inconsistent with the supplied points", () => {
    const { points, testScrewPositions, selections } = workflowFixture();
    const pairs = calculateSelectedPairwiseAnalysis(points, selections, testScrewPositions);
    const invalidPairs = pairs as PairwiseAnalysis[];
    invalidPairs[0] = { ...invalidPairs[0], amplitude: invalidPairs[0].amplitude + 1 };
    expect(() => calculateFinalCorrection(points, selections, testScrewPositions, invalidPairs)).toThrow(/inconsistent/);
    const invalidCombinedSensitivity = pairs.map((pair, index) => index === 0 ? { ...pair, combinedSensitivity: 0 } : pair);
    expect(() => calculateFinalCorrection(points, selections, testScrewPositions, invalidCombinedSensitivity)).toThrow(/inconsistent/);
    expect(() => calculateFinalCorrection(points, selections, testScrewPositions, pairs.slice(1))).toThrow(/incomplete|missing/i);
    expect(() => calculateFinalCorrection(points, selections, testScrewPositions, [...pairs, pairs[0]])).toThrow(/incomplete|invalid/i);
  });

  it("rejects incomplete direct final-correction calls", () => {
    const { points, testScrewPositions, selections } = workflowFixture();
    expect(() => calculateFinalCorrection(points.slice(0, 2), selections, testScrewPositions)).toThrow(/exactly one point/);
    expect(() => calculateFinalCorrection(points.slice(0, 5), selections, testScrewPositions)).toThrow(/exactly one point/);
  });
});
