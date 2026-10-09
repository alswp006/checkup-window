import { describe, it, expect } from "vitest";
import { buildPlan, evaluateAll, invalidFamilyLine } from "@/domain/plan";
import type { Profile } from "@/lib/types";

const TODAY = new Date(2026, 9, 10);

const bad: Profile = {
  id: "bad",
  name: "엄마",
  role: "family",
  birthYear: 1900,
  sex: "female",
  insuranceType: "dependent",
  createdAt: "2026-10-10T00:00:00.000Z",
  updatedAt: "2026-10-10T00:00:00.000Z",
};

describe("plan", () => {
  it("범위 밖 출생연도는 계획이 비고 invalidIds에 담긴다", () => {
    expect(buildPlan(bad, [], TODAY)).toEqual([]);
    expect(evaluateAll([bad], [], TODAY)).toEqual({ results: [], invalidIds: ["bad"] });
    expect(invalidFamilyLine(bad.name)).toBe("엄마 · 출생연도를 확인해주세요");
  });
});
