import { N1_SPEEDS } from "../types/trimBalance";
import type {
  EngineRun,
  ThreeShotInput,
} from "../types/trimBalance";

export function validateEngineRun(
  run: EngineRun,
  runName: string
): string[] {
  const errors: string[] = [];

  for (const speed of N1_SPEEDS) {
    const measurement = run.measurements.find(
      (item) => item.n1Speed === speed
    );

    if (!measurement) {
      errors.push(
        `${runName}: missing measurement for N1 ${speed}`
      );
      continue;
    }

    if (
      !Number.isFinite(measurement.bearingVibration) ||
      measurement.bearingVibration < 0
    ) {
      errors.push(
        `${runName}: invalid N°1 bearing vibration at N1 ${speed}`
      );
    }

    if (
      !Number.isFinite(measurement.ffccvVibration) ||
      measurement.ffccvVibration < 0
    ) {
      errors.push(
        `${runName}: invalid FFCCV vibration at N1 ${speed}`
      );
    }
  }

  return errors;
}

export function validateThreeShotInput(
  input: ThreeShotInput
): string[] {
  return [
    ...validateEngineRun(input.initialRun, "Initial run"),
    ...validateEngineRun(input.firstRun, "First run"),
    ...validateEngineRun(input.secondRun, "Second run"),
    ...validateEngineRun(input.thirdRun, "Third run"),
  ];
}
