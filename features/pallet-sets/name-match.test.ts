import { describe, expect, it } from "vitest";

import { suggestNames, type NamedOption } from "./name-match";

const options: NamedOption[] = [
  { id: "1", name: "מגש גדיד גבוה" },
  { id: "2", name: "ארגז תמרים" },
  { id: "3", name: "ירוק" },
  { id: "4", name: "צהוב" },
  { id: "5", name: "לבן" },
  { id: "6", name: "יבש" },
];

describe("suggestNames", () => {
  it("shows the common names first, then fills to five", () => {
    const ids = suggestNames(options, ["2", "3"], "").map((option) => option.id);
    expect(ids.slice(0, 2)).toEqual(["2", "3"]);
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
  });

  it("keeps a one-letter misspelling in the suggestions", () => {
    const matches = suggestNames(options, [], "מגע");
    expect(matches[0]?.id).toBe("1");
  });

  it("returns at most five matches", () => {
    expect(suggestNames(options, [], "י").length).toBeLessThanOrEqual(5);
    expect(suggestNames(options, [], "י").some((option) => option.name.startsWith("י"))).toBe(
      true,
    );
  });
});
