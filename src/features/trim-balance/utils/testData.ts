import type { ThreeShotInput } from "../types/trimBalance";

const n1Speeds = ["TO", "93.7", "85", "81", "66", "54"] as const;

function run(
  bearing: readonly number[],
  ffccv: readonly number[]
): ThreeShotInput["initialRun"] {
  return {
    measurements: n1Speeds.map((n1Speed, index) => ({
      n1Speed,
      bearingVibration: bearing[index],
      ffccvVibration: ffccv[index],
    })),
  };
}

export const exampleInput: ThreeShotInput = {
  initialRun: run(
    [6.5, 6.0, 5.5, 5.0, 4.5, 4.0],
    [4.0, 3.5, 3.0, 2.5, 2.5, 2.0]
  ),
  firstRun: run(
    [4.0, 4.0, 3.5, 3.5, 3.0, 3.5],
    [3.0, 2.0, 2.5, 2.5, 2.5, 2.0]
  ),
  secondRun: run(
    [8.6, 7.0, 7.0, 5.0, 4.5, 4.0],
    [4.0, 4.5, 3.0, 2.5, 2.5, 2.0]
  ),
  thirdRun: run(
    [7.8, 8.0, 6.6, 5.0, 4.5, 4.0],
    [6.0, 4.5, 4.0, 2.5, 2.5, 2.0]
  ),
};

export const exampleTestScrewPositions = {
  first: 35,
  second: 23,
  third: 11,
} as const;
