import { N1_SPEEDS } from "../types/trimBalance";
import type {
  EngineRun,
  ThreeShotInput,
} from "../types/trimBalance";

export const TEST_SCREW_SPACING_ERROR =
  "Test screw positions must be 120° apart (12 holes on the 36-hole cone, e.g. 35 → 23 → 11).";

export function validateTestScrewSpacing(positions: { first: number; second: number; third: number }): string | undefined {
  const values = [positions.first, positions.second, positions.third];
  if (!values.every((value) => Number.isInteger(value) && value >= 1 && value <= 36)) {
    return undefined;
  }
  const [first, second, third] = values;
  const d1 = (second - first + 36) % 36;
  const d2 = (third - second + 36) % 36;
  const d3 = (first - third + 36) % 36;
  if (d1 === d2 && d2 === d3 && (d1 === 12 || d1 === 24)) {
    return undefined;
  }
  return TEST_SCREW_SPACING_ERROR;
}

export function testScrewSpacingWarning(positions: { first: number; second: number; third: number }): string | undefined {
  return validateTestScrewSpacing(positions)
    ? `${TEST_SCREW_SPACING_ERROR} The training-manual 831.8 cm·g basis may not apply to this arrangement; confirm the applicable approved configuration. This warning is not an approval or a substitute for maintenance data.`
    : undefined;
}

function isValidMeasurementArray(values: unknown): values is EngineRun["measurements"] {
  if (!Array.isArray(values) || values.length !== N1_SPEEDS.length) {
    return false;
  }

  const seen = new Set<string>();
  for (const item of values) {
    if (!item || typeof item !== "object" || !("n1Speed" in item)) {
      return false;
    }
    const speed = item.n1Speed;
    if (typeof speed !== "string" || !N1_SPEEDS.includes(speed as typeof N1_SPEEDS[number])) {
      return false;
    }
    if (seen.has(speed)) {
      return false;
    }
    seen.add(speed);
  }

  return N1_SPEEDS.every((speed) => seen.has(speed));
}

export function validateEngineRun(
  run: EngineRun,
  runName: string
): string[] {
  const errors: string[] = [];

  if (!run || typeof run !== "object" || !Array.isArray(run.measurements)) {
    return [`${runName}: run measurements are missing or malformed.`];
  }

  if (!isValidMeasurementArray(run.measurements)) {
    errors.push(`${runName}: measurements must include exactly one value for each N1 speed and no duplicates.`);
  }

  for (const speed of N1_SPEEDS) {
    const measurement = run.measurements.find(
      (item) => item && typeof item === "object" && "n1Speed" in item && item.n1Speed === speed
    );

    if (!measurement) {
      errors.push(
        `${runName}: missing measurement for N1 ${speed}`
      );
      continue;
    }

    const bearingValue = (measurement as { bearingVibration?: number }).bearingVibration;
    if (bearingValue === undefined || !Number.isFinite(bearingValue) || bearingValue < 0) {
      errors.push(
        `${runName}: invalid N°1 bearing vibration at N1 ${speed}`
      );
    }

    const ffccvValue = (measurement as { ffccvVibration?: number }).ffccvVibration;
    if (ffccvValue === undefined || !Number.isFinite(ffccvValue) || ffccvValue < 0) {
      errors.push(
        `${runName}: invalid FFCCV vibration at N1 ${speed}`
      );
    }
  }

  return errors;
}

export function validateThreeShotInput(
  input: ThreeShotInput & { testScrewPositions?: { first: number; second: number; third: number } }
): string[] {
  const errors = [
    ...validateEngineRun(input.initialRun, "Initial run"),
    ...validateEngineRun(input.firstRun, "First run"),
    ...validateEngineRun(input.secondRun, "Second run"),
    ...validateEngineRun(input.thirdRun, "Third run"),
  ];
  if (input.testScrewPositions) {
    for (const [run, position] of Object.entries(input.testScrewPositions)) {
      if (!Number.isInteger(position) || position < 1 || position > 36) {
        errors.push(`${run} test screw position must be an integer from 1 through 36.`);
      }
    }
    if (input.testScrewPositions.first >= 1 && input.testScrewPositions.first <= 36 &&
      input.testScrewPositions.second >= 1 && input.testScrewPositions.second <= 36 &&
      input.testScrewPositions.third >= 1 && input.testScrewPositions.third <= 36) {
      const spacingError = validateTestScrewSpacing(input.testScrewPositions);
      if (spacingError) errors.push(spacingError);
    }
  }
  return errors;
}
