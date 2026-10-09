import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import {
  mockAll,
  mockOpenToast,
  mockLogClick,
  mockRequestReviewOnce,
} from "@/__tests__/__helpers__/mocks";
import { evaluateProfile } from "@/domain/checkup";
import { CHECKUP_RULES } from "@/domain/rules";
import type { CheckupItemId, CheckupRecord, ItemStatus, Profile, StoreResult } from "@/lib/types";
import CheckupItemRow from "@/components/home/CheckupItemRow";

mockAll();

const mockToggleRecord = vi.fn<(profileId: string, itemId: CheckupItemId, year: number) => StoreResult>();
vi.mock("@/data/useCheckupStore", () => ({
  useCheckupStore: () => ({ toggleRecord: mockToggleRecord }),
}));

const TODAY = new Date("2026-09-20T09:00:00+09:00");
const YEAR = 2026;
const SELF_ID = "self-1";
const NOW = "2026-09-20T00:00:00.000Z";

function profile(birthYear: number): Profile {
  return {
    id: SELF_ID,
    name: "민지",
    role: "self",
    birthYear,
    sex: "female",
    insuranceType: "employee_office",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

/** 실제 판정 엔진 결과를 행에 먹이고, 토글 성공 시 기록을 늘려 다시 판정한다. */
function Harness({ birthYear, itemId, eligibleOverride }: { birthYear: number; itemId: CheckupItemId; eligibleOverride?: number }) {
  const [records, setRecords] = useState<CheckupRecord[]>([]);
  const p = profile(birthYear);
  const result = evaluateProfile(p, records, TODAY);
  const status = result.items.find((i) => i.itemId === itemId) as ItemStatus;

  mockToggleRecord.mockImplementation((pid, iid, y) => {
    setRecords((prev) => {
      const exists = prev.some((r) => r.profileId === pid && r.itemId === iid && r.year === y);
      return exists
        ? prev.filter((r) => !(r.profileId === pid && r.itemId === iid && r.year === y))
        : [...prev, { profileId: pid, itemId: iid, year: y, receivedAt: NOW }];
    });
    return { ok: true };
  });

  return React.createElement(
    MemoryRouter,
    null,
    React.createElement(CheckupItemRow, {
      profileId: SELF_ID,
      status,
      year: YEAR,
      eligibleCount: eligibleOverride ?? result.eligibleCount,
    }),
  );
}

function renderRow(birthYear: number, itemId: CheckupItemId, eligibleOverride?: number) {
  return render(React.createElement(Harness, { birthYear, itemId, eligibleOverride }));
}

describe("검진 항목 행 — CheckupItemRow (Switch·조건부 시트)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(TODAY);
    mockToggleRecord.mockReset();
  });

  it("F5-AC-1: general Switch를 ON하면 toggleRecord(selfId,'general',2026)·logClick 1회·tickWeak, 설명이 바뀐다", () => {
    renderRow(1986, "general");
    const root = screen.getByTestId("checkup-item-general");
    expect(within(root).getByText("올해 대상 · 12월 31일까지")).toBeInTheDocument();

    fireEvent.click(within(root).getByRole("switch"));

    expect(mockToggleRecord).toHaveBeenCalledTimes(1);
    expect(mockToggleRecord).toHaveBeenCalledWith(SELF_ID, "general", 2026);
    expect(within(root).getByText("받았어요 · 다음 대상 2028년")).toBeInTheDocument();
    expect(within(root).getByRole("switch")).toBeChecked();
    expect(mockLogClick).toHaveBeenCalledTimes(1);
    expect(mockLogClick).toHaveBeenCalledWith("checkup_received_toggle");
    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "tickWeak" });
  });

  it("F5-AC-4: STORAGE_FULL이면 Switch가 이전 checked로 돌아가고 Toast를 띄운다", () => {
    renderRow(1986, "general");
    mockToggleRecord.mockImplementation(() => ({ ok: false, error: "STORAGE_FULL" }));
    const root = screen.getByTestId("checkup-item-general");

    fireEvent.click(within(root).getByRole("switch"));

    expect(mockToggleRecord).toHaveBeenCalledWith(SELF_ID, "general", 2026);
    expect(within(root).getByRole("switch")).not.toBeChecked();
    expect(within(root).getByText("올해 대상 · 12월 31일까지")).toBeInTheDocument();
    expect(mockOpenToast).toHaveBeenCalledWith("저장하지 못했어요. 다시 시도해주세요");
    expect(mockRequestReviewOnce).not.toHaveBeenCalled();
  });

  it("F5-AC-5: 비대상 행에는 Switch가 0개이고 다음 대상 연도를 보여 준다", () => {
    renderRow(1985, "general");
    const root = screen.getByTestId("checkup-item-general");
    expect(within(root).queryAllByRole("switch")).toHaveLength(0);
    expect(within(root).getByText("다음 대상 2027년")).toBeInTheDocument();
  });

  it("CS-AC-1·2: liver는 eligibleCount 0이면 Switch 0개·'조건부' Badge, eligibleCount가 있으면 Switch 1개", () => {
    const { unmount } = renderRow(1986, "liver", 0);
    let root = screen.getByTestId("checkup-item-liver");
    expect(within(root).queryAllByRole("switch")).toHaveLength(0);
    expect(within(root).getAllByText("조건부")).toHaveLength(1);
    expect(within(root).getByText("조건에 해당하면 올해 대상")).toBeInTheDocument();
    unmount();

    renderRow(1986, "liver", 2);
    root = screen.getByTestId("checkup-item-liver");
    expect(within(root).getAllByRole("switch")).toHaveLength(1);
    expect(within(root).getAllByText("조건부")).toHaveLength(1);
  });

  it("F5-AC-6: 처음 ON에서만 requestReviewOnce를 1회 부르고 OFF에서는 부르지 않는다", () => {
    renderRow(1986, "general");
    const sw = () => within(screen.getByTestId("checkup-item-general")).getByRole("switch");

    fireEvent.click(sw());
    expect(mockRequestReviewOnce).toHaveBeenCalledTimes(1);

    fireEvent.click(sw());
    expect(sw()).not.toBeChecked();
    expect(mockToggleRecord).toHaveBeenCalledTimes(2);
    expect(mockRequestReviewOnce).toHaveBeenCalledTimes(1);
  });

  it("F4-AC-7·TT-AC-3: liver 행 전체(라벨·Badge)를 탭하면 조건 전문과 출처가 든 시트가 열린다", () => {
    const liver = CHECKUP_RULES.find((r) => r.id === "liver")!;
    renderRow(1986, "liver", 2);
    const root = screen.getByTestId("checkup-item-liver");
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(within(root).getByText("간암 검진"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(liver.conditionText!)).toBeInTheDocument();
    expect(within(dialog).getByText("출처: 암관리법 시행령 별표1")).toBeInTheDocument();
  });

  it("TT-AC-3: Badge 탭도 시트를 열고, Switch 탭은 시트를 열지 않는다", () => {
    renderRow(1986, "liver", 2);
    const root = screen.getByTestId("checkup-item-liver");

    fireEvent.click(within(root).getByRole("switch"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mockToggleRecord).toHaveBeenCalledWith(SELF_ID, "liver", 2026);

    fireEvent.click(within(root).getByText("조건부"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByText("출처: 암관리법 시행령 별표1")).toBeInTheDocument();
  });

  it("조건부가 아닌 행은 탭해도 시트가 열리지 않는다", () => {
    renderRow(1986, "general");
    fireEvent.click(screen.getByText("일반건강검진"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(within(screen.getByTestId("checkup-item-general")).queryAllByText("조건부")).toHaveLength(0);
  });
});
