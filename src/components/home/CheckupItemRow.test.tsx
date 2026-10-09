import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { mockAll, mockOpenToast, mockLogClick, mockRequestReviewOnce } from "@/__tests__/__helpers__/mocks";
import CheckupItemRow from "@/components/home/CheckupItemRow";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { CHECKUP_RULES } from "@/domain/rules";
import type { CheckupItemId, ItemStatus, StoreResult } from "@/lib/types";

mockAll();

const mockToggleRecord = vi.fn<(profileId: string, itemId: CheckupItemId, year: number) => StoreResult>();
vi.mock("@/data/useCheckupStore", () => ({
  useCheckupStore: () => ({ toggleRecord: mockToggleRecord }),
}));

function status(overrides: Partial<ItemStatus> = {}): ItemStatus {
  return {
    itemId: "general",
    label: "일반건강검진",
    eligibleThisYear: true,
    conditional: false,
    received: false,
    nextYear: 2028,
    reason: "",
    ...overrides,
  };
}

function renderRow(s: ItemStatus, eligibleCount = 1) {
  return render(
    <MemoryRouter>
      <CheckupItemRow profileId="self-1" status={s} year={2026} eligibleCount={eligibleCount} />
    </MemoryRouter>,
  );
}

describe("CheckupItemRow", () => {
  beforeEach(() => {
    mockToggleRecord.mockReset();
    mockToggleRecord.mockReturnValue({ ok: true });
  });

  it("Switch를 켜면 toggleRecord·logClick·tickWeak·리뷰 요청을 부른다", () => {
    renderRow(status());
    fireEvent.click(screen.getByRole("switch"));
    expect(mockToggleRecord).toHaveBeenCalledWith("self-1", "general", 2026);
    expect(mockLogClick).toHaveBeenCalledWith("checkup_received_toggle");
    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "tickWeak" });
    expect(mockRequestReviewOnce).toHaveBeenCalledTimes(1);
  });

  it("받은 항목을 끄면 리뷰를 요청하지 않는다", () => {
    renderRow(status({ received: true }));
    fireEvent.click(screen.getByRole("switch"));
    expect(mockToggleRecord).toHaveBeenCalledTimes(1);
    expect(mockRequestReviewOnce).not.toHaveBeenCalled();
  });

  it("저장에 실패하면 Switch가 그대로이고 토스트를 띄운다", () => {
    mockToggleRecord.mockReturnValue({ ok: false, error: "STORAGE_FULL" });
    renderRow(status());
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByRole("switch")).not.toBeChecked();
    expect(mockOpenToast).toHaveBeenCalledWith("저장하지 못했어요. 다시 시도해주세요");
    expect(mockRequestReviewOnce).not.toHaveBeenCalled();
  });

  it("비대상 행과 대상 없는 조건부 행에는 Switch가 없다", () => {
    const { unmount } = renderRow(status({ eligibleThisYear: false, nextYear: 2027 }));
    expect(screen.queryAllByRole("switch")).toHaveLength(0);
    unmount();
    renderRow(status({ itemId: "liver", label: "간암 검진", conditional: true }), 0);
    expect(screen.queryAllByRole("switch")).toHaveLength(0);
  });

  it("조건부 행을 탭하면 조건 전문과 출처 시트가 열리고 Switch 탭은 열지 않는다", () => {
    const liver = CHECKUP_RULES.find((r) => r.id === "liver")!;
    renderRow(status({ itemId: "liver", label: "간암 검진", conditional: true }), 2);
    const root = screen.getByTestId("checkup-item-liver");

    fireEvent.click(within(root).getByRole("switch"));
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(within(root).getByText("조건부"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(liver.conditionText!)).toBeInTheDocument();
    expect(within(dialog).getByText(`출처: ${liver.source}`)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
