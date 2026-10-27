import { describe, expect, it } from "vitest";
import { createCalculation } from "./calculationRecord";
import { reportPersistenceState } from "./reportPersistence";

describe("report persistence identity", () => {
  it("labels a new live draft as not persisted", () => {
    expect(reportPersistenceState(createCalculation(), null)).toBe("live-draft");
  });

  it("identifies a current calculation matching its successfully saved snapshot", () => {
    const saved = createCalculation();
    expect(reportPersistenceState(saved, saved)).toBe("saved-record");
  });

  it("does not represent edits after save as part of the persisted snapshot", () => {
    const snapshot = createCalculation();
    const edited = { ...snapshot, information: { ...snapshot.information, notes: "unsaved edit" } };
    expect(reportPersistenceState(edited, snapshot)).toBe("unsaved-edits");
  });

  it("keeps a failed-save draft live because no persisted snapshot was established", () => {
    expect(reportPersistenceState(createCalculation(), null)).toBe("live-draft");
  });

  it("recognizes data restored from a saved record as matching after reload", () => {
    const saved = createCalculation();
    const reloaded = JSON.parse(JSON.stringify(saved));
    expect(reportPersistenceState(reloaded, reloaded)).toBe("saved-record");
  });
});
