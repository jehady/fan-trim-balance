import { describe, expect, it } from "vitest";
import { createCalculation } from "./calculationRecord";
import { dashboardSummary } from "./dashboardSummary";

describe("dashboard workflow counts", () => {
  it("counts saved draft and in-progress records without claiming completion", () => {
    const draft = createCalculation();
    const active = createCalculation();
    active.status = "In Progress";
    expect(dashboardSummary([draft, active])).toEqual({ saved: 2, drafts: 1, inProgress: 1 });
  });
});
