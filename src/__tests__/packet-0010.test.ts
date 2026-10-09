import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { validateProfileForm } from "@/pages/profileForm/validate";
import ProfileFormFields from "@/pages/profileForm/ProfileFormFields";

mockAll();

const ctx = { thisYear: 2026, existingNames: [] as string[], familyCount: 0, mode: "self" as const };
const full = { name: "엄마", birthYear: "1960", sex: "female" as const, insuranceType: "dependent" as const };

describe("프로필 폼 본문 — validate", () => {
  it("F3-AC-2: 출생연도 자릿수·범위 에러 문구", () => {
    expect(validateProfileForm({ ...full, birthYear: "198" }, ctx).birthYear).toBe("출생연도 4자리를 입력해주세요");
    expect(validateProfileForm({ ...full, birthYear: "1919" }, ctx).birthYear).toBe("1920~2026년 사이로 입력해주세요");
    expect(validateProfileForm({ ...full, birthYear: "2027" }, ctx).birthYear).toBe("1920~2026년 사이로 입력해주세요");
    expect(validateProfileForm({ ...full, birthYear: "1920" }, ctx).birthYear).toBeUndefined();
    expect(validateProfileForm({ ...full, birthYear: "2026" }, ctx).birthYear).toBeUndefined();
  });

  it("F3-AC-3·4: 성별·가입유형·이름 누락 문구", () => {
    const e = validateProfileForm({ birthYear: "1960" }, ctx);
    expect(e.sex).toBe("성별을 선택해주세요");
    expect(e.insuranceType).toBe("가입 유형을 선택해주세요");
    expect(e.name).toBe("이름을 입력해주세요");
    expect(validateProfileForm(full, ctx)).toEqual({});
  });

  it("F3-AC-4: 이름 중복과 가족 9명 제한", () => {
    const dup = validateProfileForm(full, { ...ctx, existingNames: ["엄마"] });
    expect(dup.name).toBe("이미 같은 이름의 프로필이 있어요");
    const lim = validateProfileForm(full, { ...ctx, mode: "family", familyCount: 9 });
    expect(JSON.stringify(lim)).toContain("가족은 최대 9명까지 추가할 수 있어요");
    const ok = validateProfileForm(full, { ...ctx, mode: "family", familyCount: 8 });
    expect(JSON.stringify(ok)).not.toContain("최대 9명");
  });
});

function setup(values: Record<string, unknown> = { name: "", birthYear: "" }) {
  const onChange = vi.fn();
  const ui = (v: Record<string, unknown>) =>
    React.createElement(MemoryRouter, null, React.createElement(ProfileFormFields as any, { values: v, onChange }));
  const utils = render(ui(values));
  return { onChange, ui, ...utils };
}

describe("프로필 폼 본문 — ProfileFormFields", () => {
  it("F3-AC-5: 출생연도는 numeric/maxLength 4, 비숫자 제거, Enter 시 blur", () => {
    const { onChange } = setup();
    const input = screen.getByLabelText("출생연도") as HTMLInputElement;
    expect(input.getAttribute("inputmode")).toBe("numeric");
    expect(input.getAttribute("maxlength")).toBe("4");
    fireEvent.change(input, { target: { value: "19a8" } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ birthYear: "198" }));
    input.focus();
    expect(document.activeElement).toBe(input);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(document.activeElement).not.toBe(input);
  });

  it("F3-AC-8: 가입유형 ListRow 5개와 설명 문구", () => {
    setup();
    const rows = screen.getAllByRole("button").filter((el) => el.tagName === "LI");
    expect(rows).toHaveLength(5);
    const desc = (label: string) => rows.find((r) => within(r).queryByText(label))!;
    expect(within(desc("직장가입자(비사무직)")).getByText("매년 검진 대상이에요")).toBeInTheDocument();
    expect(within(desc("피부양자·세대원")).getByText("만 20세 이상부터 대상이에요")).toBeInTheDocument();
    expect(within(desc("의료급여수급권자")).getByText("만 19~64세가 대상이에요")).toBeInTheDocument();
  });

  it("AC-5: 성별 ChipItem 선택 시 tickWeak 1회 + 선택 표시", () => {
    const { onChange, ui, rerender } = setup();
    fireEvent.click(screen.getByRole("button", { name: "여성" }));
    expect(generateHapticFeedback).toHaveBeenCalledTimes(1);
    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "tickWeak" });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ sex: "female" }));
    rerender(ui({ name: "", birthYear: "", sex: "female" }));
    expect(screen.getByRole("button", { name: "여성", pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "남성", pressed: false })).toBeInTheDocument();
  });

  it("AC-5: 가입유형 ListRow 선택 시 tickWeak 1회 + onChange", () => {
    const { onChange } = setup();
    const row = screen.getAllByRole("button").find((el) => el.tagName === "LI" && within(el).queryByText("피부양자·세대원"))!;
    fireEvent.click(row);
    expect(generateHapticFeedback).toHaveBeenCalledTimes(1);
    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "tickWeak" });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ insuranceType: "dependent" }));
  });
});
