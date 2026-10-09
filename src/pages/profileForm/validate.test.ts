import { describe, it, expect } from "vitest";
import { validateProfileForm } from "@/pages/profileForm/validate";

const ctx = { thisYear: 2026, existingNames: [] as string[], familyCount: 0, mode: "self" as const };
const full = { name: "엄마", birthYear: "1966", sex: "female" as const, insuranceType: "dependent" as const };

describe("validateProfileForm", () => {
  it("F3-AC-2: 4자리가 아니면 자릿수 문구, 범위 밖이면 범위 문구", () => {
    expect(validateProfileForm({ ...full, birthYear: "198" }, ctx).birthYear).toBe("출생연도 4자리를 입력해주세요");
    expect(validateProfileForm({ ...full, birthYear: "" }, ctx).birthYear).toBe("출생연도 4자리를 입력해주세요");
    expect(validateProfileForm({ ...full, birthYear: "1919" }, ctx).birthYear).toBe("1920~2026년 사이로 입력해주세요");
    expect(validateProfileForm({ ...full, birthYear: "2027" }, ctx).birthYear).toBe("1920~2026년 사이로 입력해주세요");
    expect(validateProfileForm({ ...full, birthYear: "1920" }, ctx).birthYear).toBeUndefined();
    expect(validateProfileForm({ ...full, birthYear: "2026" }, ctx).birthYear).toBeUndefined();
  });

  it("F3-AC-2: 범위 상한은 ctx.thisYear를 따른다", () => {
    expect(validateProfileForm({ ...full, birthYear: "2027" }, { ...ctx, thisYear: 2027 }).birthYear).toBeUndefined();
    expect(validateProfileForm({ ...full, birthYear: "2028" }, { ...ctx, thisYear: 2027 }).birthYear).toBe(
      "1920~2027년 사이로 입력해주세요",
    );
  });

  it("F3-AC-3·4: 성별·가입유형·이름 누락 문구, 다 채우면 빈 객체", () => {
    const e = validateProfileForm({ name: "  ", birthYear: "1966" }, ctx);
    expect(e.sex).toBe("성별을 선택해주세요");
    expect(e.insuranceType).toBe("가입 유형을 선택해주세요");
    expect(e.name).toBe("이름을 입력해주세요");
    expect(validateProfileForm(full, ctx)).toEqual({});
  });

  it("F3-AC-4: 같은 이름이 있으면 중복 문구", () => {
    expect(validateProfileForm(full, { ...ctx, existingNames: ["나", "엄마"] }).name).toBe(
      "이미 같은 이름의 프로필이 있어요",
    );
    expect(validateProfileForm({ ...full, name: " 엄마 " }, { ...ctx, existingNames: ["엄마"] }).name).toBe(
      "이미 같은 이름의 프로필이 있어요",
    );
  });

  it("F3-AC-4: 가족 모드에서 9명이면 인원 제한 문구, 8명이면 없음", () => {
    expect(validateProfileForm(full, { ...ctx, mode: "family", familyCount: 9 }).form).toBe(
      "가족은 최대 9명까지 추가할 수 있어요",
    );
    expect(validateProfileForm(full, { ...ctx, mode: "family", familyCount: 8 })).toEqual({});
    expect(validateProfileForm(full, { ...ctx, mode: "self", familyCount: 9 })).toEqual({});
  });
});
