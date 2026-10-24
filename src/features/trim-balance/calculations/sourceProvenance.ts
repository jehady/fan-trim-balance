import type { SourceProvenance } from "../types/trimBalance";

export const trainingManualSource: SourceProvenance = {
  documentTitle: "CFM56-7B Training Manual — Engine Fan Trim Balance (3 Shot Plot)",
  revisionOrDate: "August 1999",
  effectivity: "737-600/700/800/900/BBJ/COMBI/C40A (as stated in the manual)",
  sectionOrFigure: "71-00-00, pages 30–40",
  verificationStatus: "unverified",
};

export const suppliedScrewFigureSource: SourceProvenance = {
  documentTitle: "AMM A318/A319/A320/A321 — Figure 71-00-00-991-01700-00-A, Balancing Screws",
  revisionOrDate: "Revision 62, 1 May 2026",
  effectivity: "MSN 01402 / FSN 100–150 as identified in the supplied PDF",
  sectionOrFigure: "Figure 71-00-00-991-01700-00-A, sheet 1",
  verificationStatus: "not-applicable",
};

export const testWeightConstantSource = {
  valueCmG: 831.8,
  provenance: trainingManualSource,
  status: "training-manual value; applicability to the recorded engine is unverified",
} as const;

export const poChartStatus =
  "Unavailable: no complete, applicable, approved PO weight/location chart has been supplied or verified.";
