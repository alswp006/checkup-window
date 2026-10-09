import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import ProfileFormFields from "@/pages/profileForm/ProfileFormFields";
import type { ProfileFormErrors, ProfileFormValues } from "@/pages/profileForm/validate";

mockAll();

const empty: ProfileFormValues = { name: "", birthYear: "" };

function setup(values: ProfileFormValues = empty, errors?: ProfileFormErrors) {
  const onChange = vi.fn();
  const utils = render(<ProfileFormFields values={values} onChange={onChange} errors={errors} />);
  const rerenderWith = (v: ProfileFormValues) => utils.rerender(<ProfileFormFields values={v} onChange={onChange} />);
  return { onChange, rerenderWith, ...utils };
}

const insuranceRows = () => screen.getAllByRole("button").filter((el) => el.tagName === "LI");
const rowOf = (label: string) => insuranceRows().find((r) => within(r).queryByText(label))!;

describe("ProfileFormFields", () => {
  it("F3-AC-5: 출생연도 numeric/maxLength 4, 비숫자 제거, Enter 시 blur", () => {
    const { onChange } = setup();
    const input = screen.getByLabelText("출생연도") as HTMLInputElement;
    expect(input.getAttribute("inputmode")).toBe("numeric");
    expect(input.getAttribute("maxlength")).toBe("4");
    expect(input).toHaveAttribute("placeholder", "예: 1990");
    fireEvent.change(input, { target: { value: "19a8" } });
    expect(onChange).toHaveBeenCalledWith({ name: "", birthYear: "198" });
    input.focus();
    expect(document.activeElement).toBe(input);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(document.activeElement).not.toBe(input);
  });

  it("빈 칸에서도 이름·출생연도 라벨이 보인다(sustain)", () => {
    setup();
    expect(screen.getByText("이름")).toBeVisible();
    expect(screen.getByText("출생연도")).toBeVisible();
    expect(screen.getByLabelText("이름")).toHaveAttribute("maxlength", "10");
  });

  it("F3-AC-8: 가입유형 ListRow 5개와 설명 문구", () => {
    setup();
    expect(insuranceRows()).toHaveLength(5);
    expect(within(rowOf("직장가입자(비사무직)")).getByText("매년 검진 대상이에요")).toBeInTheDocument();
    expect(within(rowOf("피부양자·세대원")).getByText("만 20세 이상부터 대상이에요")).toBeInTheDocument();
    expect(within(rowOf("의료급여수급권자")).getByText("만 19~64세가 대상이에요")).toBeInTheDocument();
  });

  it("AC-5: 성별 ChipItem 선택 시 tickWeak 1회 + 선택 표시", () => {
    const { onChange, rerenderWith } = setup();
    fireEvent.click(screen.getByRole("button", { name: "여성" }));
    expect(generateHapticFeedback).toHaveBeenCalledTimes(1);
    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "tickWeak" });
    expect(onChange).toHaveBeenCalledWith({ name: "", birthYear: "", sex: "female" });
    rerenderWith({ ...empty, sex: "female" });
    expect(screen.getByRole("button", { name: "여성", pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "남성", pressed: false })).toBeInTheDocument();
  });

  it("AC-5: 가입유형 선택 시 tickWeak 1회 + onChange, 선택 행에만 체크 표시", () => {
    const { onChange, rerenderWith } = setup();
    fireEvent.click(rowOf("피부양자·세대원"));
    expect(generateHapticFeedback).toHaveBeenCalledTimes(1);
    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "tickWeak" });
    expect(onChange).toHaveBeenCalledWith({ name: "", birthYear: "", insuranceType: "dependent" });
    rerenderWith({ ...empty, insuranceType: "dependent" });
    expect(screen.getAllByRole("img", { name: "icon-check" })).toHaveLength(1);
    expect(within(rowOf("피부양자·세대원")).getByRole("img", { name: "icon-check" })).toBeInTheDocument();
    expect(rowOf("피부양자·세대원")).toHaveAttribute("aria-pressed", "true");
  });

  it("에러 문구를 각 칸 아래에 보여 준다", () => {
    setup(empty, {
      name: "이름을 입력해주세요",
      birthYear: "출생연도 4자리를 입력해주세요",
      sex: "성별을 선택해주세요",
      insuranceType: "가입 유형을 선택해주세요",
    });
    expect(screen.getByText("이름을 입력해주세요")).toBeInTheDocument();
    expect(screen.getByText("출생연도 4자리를 입력해주세요")).toBeInTheDocument();
    expect(screen.getByText("성별을 선택해주세요")).toBeInTheDocument();
    expect(screen.getByText("가입 유형을 선택해주세요")).toBeInTheDocument();
    expect(screen.getByLabelText("이름")).toHaveAttribute("aria-invalid", "true");
  });
});
