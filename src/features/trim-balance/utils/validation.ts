import { N1_SPEEDS } from "../types/trimBalance";
import type {
  EngineRun,
  ThreeShotInput,
} from "../types/trimBalance";

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
  }
  return errors;
}
