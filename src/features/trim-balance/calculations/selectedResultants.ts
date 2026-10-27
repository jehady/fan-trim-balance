import { calculateBalanceWeight, calculateSensitivity } from "./balanceWeight";
import { buildThreeShotCircles, distance, normalizeAngleDegrees, polarToCartesian, validateResultantSelection, type Point } from "./geometry";
import type { BalancePoint, PairwiseAnalysis } from "./pairwiseAnalysis";
import { CalculationValidationError } from "./calculationValidation";
import { N1_SPEEDS, type PlotPointData, type PlotPointLabel, type SensorType } from "../types/trimBalance";
import { validateTestScrewSpacing } from "../utils/validation";

export type SelectedResultants = Partial<Record<PlotPointLabel, Point>>;

export interface SelectedResultantsValidation {
  valid: boolean;
  errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFinitePoint(value: unknown): value is Point {
  return isRecord(value) &&
    typeof value.x === "number" && Number.isFinite(value.x) &&
    typeof value.y === "number" && Number.isFinite(value.y);
}

export function validateSelectedResultants(
  points: PlotPointData[],
  selections: SelectedResultants,
  testScrewPositions: { first: number; second: number; third: number }
): SelectedResultantsValidation {
  const expectedLabels: PlotPointLabel[] = ["A", "B", "C", "D", "E", "F"];
  const expectedSensors: Record<PlotPointLabel, SensorType> = {
    A: "bearing",
    B: "bearing",
    C: "bearing",
    D: "ffccv",
    E: "ffccv",
    F: "ffccv",
  };
  const errors: string[] = [];
  if (!Array.isArray(points) || Array.from(points).some((point) => !isRecord(point))) {
    return { valid: false, errors: ["Current plot point data is missing or malformed."] };
  }
  if (!isRecord(selections)) {
    return { valid: false, errors: ["Selected resultant data is missing or malformed."] };
  }
  if (!isRecord(testScrewPositions)) {
    return { valid: false, errors: ["Test screw positions are missing or malformed."] };
  }

  if (points.length !== expectedLabels.length ||
    new Set(points.map(({ label }) => label)).size !== expectedLabels.length ||
    expectedLabels.some((label) => !points.some((point) => point.label === label))) {
    errors.push("Current calculation inputs must produce exactly one point for each label A–F.");
  }
  if (points.some((point) =>
    !expectedLabels.includes(point.label) ||
    !["bearing", "ffccv"].includes(point.sensor) ||
    !N1_SPEEDS.includes(point.n1Speed) ||
    ![point.initialVibration, point.firstVibration, point.secondVibration, point.thirdVibration]
      .every((value) => typeof value === "number" && Number.isFinite(value) && value >= 0)
  )) {
    errors.push("Current plot points contain malformed labels, sources, or non-finite measurements.");
  }
  const sourceIdentities = points.map(({ sensor, n1Speed }) => `${sensor}:${n1Speed}`);
  if (points.some((point) =>
    point.sensor !== expectedSensors[point.label] ||
    !N1_SPEEDS.includes(point.n1Speed) ||
    !["bearing", "ffccv"].includes(point.sensor)
  ) || new Set(sourceIdentities).size !== sourceIdentities.length) {
    errors.push("Current A–F points must contain unique, correctly assigned sensor and N1-speed sources.");
  }

  const selectedLabels = Object.keys(selections);
  if (selectedLabels.length !== expectedLabels.length || expectedLabels.some((label) => !selectedLabels.includes(label))) {
    errors.push("Confirm exactly one resultant for each label A–F.");
  }
  if (!["first", "second", "third"].every((key) => {
    const position = testScrewPositions[key as keyof typeof testScrewPositions];
    return Number.isInteger(position) && position >= 1 && position <= 36;
  })) {
    errors.push("Test screw positions are invalid; review the run configuration.");
    return { valid: false, errors };
  }
  const spacingError = validateTestScrewSpacing(testScrewPositions);
  if (spacingError) errors.push(spacingError);

  for (const point of points) {
    const selected = selections[point.label];
    if (!Object.hasOwn(selections, point.label)) {
      errors.push(`${point.label}: resultant or current plot geometry is missing.`);
      continue;
    }
    if (!isFinitePoint(selected)) {
      errors.push(`${point.label}: resultant coordinates must be finite numbers.`);
      continue;
    }
    if (![point.initialVibration, point.firstVibration, point.secondVibration, point.thirdVibration]
      .every((value) => Number.isFinite(value) && value >= 0)) {
      errors.push(`${point.label}: current source measurements are invalid.`);
      continue;
    }
    const circles = buildThreeShotCircles({
      initialVibration: point.initialVibration,
      firstRunVibration: point.firstVibration,
      secondRunVibration: point.secondVibration,
      thirdRunVibration: point.thirdVibration,
      firstTestScrewPosition: testScrewPositions.first,
      secondTestScrewPosition: testScrewPositions.second,
      thirdTestScrewPosition: testScrewPositions.third,
    });
    const validation = validateResultantSelection(
      [circles.firstCircle, circles.secondCircle, circles.thirdCircle],
      selected
    );
    if (!validation.valid) {
      errors.push(`${point.label}: ${validation.reason ?? "resultant is invalid for current geometry."}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateAllSelectedResultants(
  points: PlotPointData[],
  selections: SelectedResultants,
  testScrewPositions: { first: number; second: number; third: number }
): boolean {
  return validateSelectedResultants(points, selections, testScrewPositions).valid;
}

export interface SelectedResultMetrics {
  resultantPoint: Point;
  resultantAmplitude: number;
  resultantAngleDeg: number;
  w6CmG: number;
  sensitivity: number;
}

export function storeSelectedResultant(
  selections: SelectedResultants,
  label: PlotPointLabel,
  point: Point
): SelectedResultants {
  return { ...selections, [label]: point };
}

export function calculateSelectedResultMetrics(
  point: PlotPointData,
  resultant: Point | undefined
): SelectedResultMetrics | undefined {
  if (!resultant || !isFinitePoint(resultant) || !isRecord(point)) {
    return undefined;
  }

  const resultantAmplitude = Math.hypot(resultant.x, resultant.y);
  if (!Number.isFinite(resultant.x) || !Number.isFinite(resultant.y) ||
    !Number.isFinite(point.initialVibration) || point.initialVibration < 0 ||
    !Number.isFinite(resultantAmplitude) || resultantAmplitude === 0) {
    return undefined;
  }

  const w6CmG = calculateBalanceWeight(point.initialVibration, resultantAmplitude);
  const sensitivity = calculateSensitivity(resultantAmplitude);
  const resultantAngleDeg = normalizeAngleDegrees(Math.atan2(resultant.x, resultant.y) * 180 / Math.PI);
  if (![w6CmG, sensitivity, resultantAngleDeg].every(Number.isFinite) || sensitivity <= 0) {
    return undefined;
  }

  return {
    resultantPoint: resultant,
    resultantAmplitude,
    resultantAngleDeg,
    w6CmG,
    sensitivity,
  };
}

export function calculateSelectedPairwiseAnalysis(
  points: PlotPointData[],
  selections: SelectedResultants,
  testScrewPositions: { first: number; second: number; third: number }
): PairwiseAnalysis[] {
  const validation = validateSelectedResultants(points, selections, testScrewPositions);
  if (!validation.valid) {
    throw new CalculationValidationError(validation.errors.join(" "));
  }
  const balancePoints = buildSelectedBalancePoints(points, selections);
  if (balancePoints.length !== 6) {
    throw new CalculationValidationError("Pairwise analysis requires all six validated A–F balance points.");
  }
  const results: PairwiseAnalysis[] = [];
  for (let first = 0; first < balancePoints.length; first += 1) {
    for (let second = first + 1; second < balancePoints.length; second += 1) {
      const combinedSensitivity = balancePoints[first].sensitivity + balancePoints[second].sensitivity;
      const distanceCmG = distance(balancePoints[first].point, balancePoints[second].point);
      const amplitude = distanceCmG / combinedSensitivity;
      if (!Number.isFinite(combinedSensitivity) || combinedSensitivity <= 0 ||
        !Number.isFinite(distanceCmG) || !Number.isFinite(amplitude) || amplitude < 0) {
        throw new CalculationValidationError("Pairwise analysis produced an invalid distance, combined sensitivity, or U value.");
      }
      results.push({
        pair: `${balancePoints[first].label}${balancePoints[second].label}`,
        distanceCmG,
        combinedSensitivity,
        amplitude,
      });
    }
  }
  return results;
}

export function buildSelectedBalancePoints(
  points: PlotPointData[],
  selections: SelectedResultants
): BalancePoint[] {
  return points.flatMap((point) => {
    const metrics = calculateSelectedResultMetrics(point, selections[point.label]);
    return metrics ? [{ label: point.label, point: polarToCartesian(metrics.w6CmG, metrics.resultantAngleDeg), sensitivity: metrics.sensitivity }] : [];
  });
}
