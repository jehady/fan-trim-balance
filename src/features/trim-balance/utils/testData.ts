import type { ThreeShotInput } from "../types/trimBalance";

export const exampleInput: ThreeShotInput = {
  initialRun: {
    measurements: [
      {
        n1Speed: "TO",
        bearingVibration: 6.5,
        ffccvVibration: 3.2,
      },
      {
        n1Speed: "93.7",
        bearingVibration: 4.2,
        ffccvVibration: 4.8,
      },
      {
        n1Speed: "85",
        bearingVibration: 3.8,
        ffccvVibration: 2.9,
      },
      {
        n1Speed: "81",
        bearingVibration: 2.7,
        ffccvVibration: 5.4,
      },
      {
        n1Speed: "66",
        bearingVibration: 2.1,
        ffccvVibration: 2.6,
      },
      {
        n1Speed: "54",
        bearingVibration: 1.8,
        ffccvVibration: 2.0,
      },
    ],
  },

  firstRun: {
    measurements: [],
  },

  secondRun: {
    measurements: [],
  },

  thirdRun: {
    measurements: [],
  },
};
