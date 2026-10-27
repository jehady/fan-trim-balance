import { normalizeAngleDegrees, type Point } from "./geometry";
import {
  buildSelectedBalancePoints,
  calculateSelectedPairwiseAnalysis,
  validateSelectedResultants,
  type SelectedResultants,
} from "./selectedResultants";
import { CalculationValidationError } from "./calculationValidation";
import type { PairwiseAnalysis } from "./pairwiseAnalysis";
import type { PlotPointData, PlotPointLabel } from "../types/trimBalance";

export interface FinalCorrectionResult {
  selectedPair: string;
  u: number;
  firstPoint: Point;
  secondPoint: Point;
  pairDistance: number;
  distanceFromFirst: number;
  finalPoint: Point;
  finalWeightCmG: number;
  finalAngleDeg: number;
}

function assertPairwiseMatches(expected: PairwiseAnalysis[], supplied: PairwiseAnalysis[]): void {
  if (supplied.length !== expected.length) {
    throw new CalculationValidationError("Pairwise data is incomplete for the validated A–F resultants.");
  }
  const expectedByPair = new Map(expected.map((pair) => [pair.pair, pair]));
  const seen = new Set<string>();
  for (const pair of supplied) {
    const source = expectedByPair.get(pair.pair);
    if (!source || seen.has(pair.pair) ||
      ![pair.distanceCmG, pair.combinedSensitivity, pair.amplitude].every(Number.isFinite) ||
      pair.distanceCmG !== source.distanceCmG ||
      pair.combinedSensitivity !== source.combinedSensitivity ||
      pair.amplitude !== source.amplitude) {
      throw new CalculationValidationError(`Pairwise data for ${pair.pair} is invalid or inconsistent with the validated A–F resultants.`);
    }
    seen.add(pair.pair);
  }
  if (seen.size !== expected.length) {
    throw new CalculationValidationError("Pairwise data is missing one or more validated A–F pairs.");
  }
}

function maximumUPair(pairs: PairwiseAnalysis[]): PairwiseAnalysis {
  return pairs.reduce((highest, pair) => pair.amplitude > highest.amplitude ? pair : highest);
}

function calculateCorrectionVector(
  first: ReturnType<typeof buildSelectedBalancePoints>[number],
  second: ReturnType<typeof buildSelectedBalancePoints>[number],
  pair: PairwiseAnalysis
): FinalCorrectionResult {
  const directionX = second.point.x - first.point.x;
  const directionY = second.point.y - first.point.y;
  const pairDistance = Math.hypot(directionX, directionY);
  if (!Number.isFinite(pairDistance) || pairDistance === 0) {
    throw new CalculationValidationError("The selected maximum-U pair has overlapping or invalid balance points.");
  }

  const distanceFromFirst = pair.amplitude * first.sensitivity;
  const finalPoint = {
    x: first.point.x + (directionX / pairDistance) * distanceFromFirst,
    y: first.point.y + (directionY / pairDistance) * distanceFromFirst,
  };
  const finalWeightCmG = Math.hypot(finalPoint.x, finalPoint.y);
  const finalAngleDeg = normalizeAngleDegrees(Math.atan2(finalPoint.x, finalPoint.y) * 180 / Math.PI);
  if (![distanceFromFirst, finalPoint.x, finalPoint.y, finalWeightCmG, finalAngleDeg].every(Number.isFinite)) {
    throw new CalculationValidationError("Final correction produced a non-finite result.");
  }

  return {
    selectedPair: pair.pair,
    u: pair.amplitude,
    firstPoint: first.point,
    secondPoint: second.point,
    pairDistance,
    distanceFromFirst,
    finalPoint,
    finalWeightCmG,
    finalAngleDeg,
  };
}

export function calculateFinalCorrection(
  plotPoints: PlotPointData[],
  selections: SelectedResultants,
  testScrewPositions: { first: number; second: number; third: number },
  suppliedPairs?: PairwiseAnalysis[]
): FinalCorrectionResult {
  const validation = validateSelectedResultants(plotPoints, selections, testScrewPositions);
  if (!validation.valid) {
    throw new CalculationValidationError(validation.errors.join(" "));
  }

  const pairs = calculateSelectedPairwiseAnalysis(plotPoints, selections, testScrewPositions);
  if (suppliedPairs) {
    assertPairwiseMatches(pairs, suppliedPairs);
  }
  const selectedPair = maximumUPair(pairs);
  const balancePoints = buildSelectedBalancePoints(plotPoints, selections);
  const firstLabel = selectedPair.pair[0] as PlotPointLabel;
  const secondLabel = selectedPair.pair[1] as PlotPointLabel;
  const first = balancePoints.find((point) => point.label === firstLabel);
  const second = balancePoints.find((point) => point.label === secondLabel);
  if (!first || !second) {
    throw new CalculationValidationError(`Selected pair ${selectedPair.pair} has no matching validated balance points.`);
  }
  return calculateCorrectionVector(first, second, selectedPair);
}
