import type { TrimBalanceCalculation } from "../types/trimBalance";

export function dashboardSummary(calculations: TrimBalanceCalculation[]) {
  return {
    saved: calculations.length,
    drafts: calculations.filter((item) => item.status === "Draft").length,
    inProgress: calculations.filter((item) => item.status === "In Progress").length,
  };
}
