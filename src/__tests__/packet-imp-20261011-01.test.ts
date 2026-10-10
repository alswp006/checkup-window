import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { mockAnalytics, mockNavigate, mockRouter, mockTds } from "@/__tests__/__helpers__/mocks";
import { CheckupStoreProvider } from "@/data/CheckupStoreProvider";
import { KEYS } from "@/data/storage";
import { CHECKUP_RULES } from "@/domain/rules";
import CheckupItemRow from "@/components/home/CheckupItemRow";
import FamilyChecklistSheet from "@/components/home/FamilyChecklistSheet";
import HomeFooterActions from "@/components/home/HomeFooterActions";
import type { ItemStatus } from "@/lib/types";

vi.mock("@apps-in-toss/web-framework", () => ({ generateHapticFeedback: vi.fn() }));

mockTds();
mockRouter();
mockAnalytics();

const NOW = "2026-10-10T00:00:00.000Z";
const SELF_ID = "self-1";

const FILES = [
  "src/components/home/CheckupItemRow.tsx",
  "src/components/home/FamilyChecklistSheet.tsx",
  "src/components/home/HomeFooterActions.tsx",
];

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

/** <BottomSheet ...> 여는 태그 끝(>)부터 </BottomSheet>까지의 본문(children)만 잘라낸다. */
function sheetBodies(src: string): string[] {
  const bodies: string[] = [];
  const re = /<BottomSheet(?![.\w])[\s\S]*?\n?\s*>\s*\n([\s\S]*?)<\/BottomSheet>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) bodies.push(m[1]);
  return bodies;
}

function seed() {
  localStorage.setItem(
    KEYS.profiles,
    JSON.stringify({
      version: 1,
      data: [
        { id: SELF_ID, name: "나", role: "self", birthYear: 1986, sex: "male", insuranceType: "employee_office", createdAt: NOW, updatedAt: NOW },
      ],
    }),
  );
  localStorage.setItem(KEYS.records, JSON.stringify({ version: 1, data: [] }));
  localStorage.setItem(KEYS.banner, JSON.stringify({ dismissedMonth: "2026-10" }));
}

function wrap(node: React.ReactElement) {
  return render(
    React.createElement(MemoryRouter, null, React.createElement(CheckupStoreProvider, null, node)),
  );
}

describe("[개선] TDS 컴포넌트 3곳을 벤더 모양대로 고치기", () => {
  beforeEach(() => {
    seed();
    mockNavigate.mockReset();
  });

  it("AC-1/5/9: BottomSheet children 안에 <Button>이 없다 (U5-sheet-button-in-children)", () => {
    for (const file of FILES) {
      const bodies = sheetBodies(source(file));
      expect(bodies.length, `${file} BottomSheet 수`).toBeGreaterThanOrEqual(1);
      for (const body of bodies) {
        expect(body, file).not.toMatch(/<Button[\s>]/);
      }
    }
  });

  it("AC-2/6/10: 닫기·정보 수정 버튼은 cta={<BottomSheet.CTA>}로 넘긴다", () => {
    for (const file of FILES) {
      expect(source(file), file).toMatch(/cta=\{\s*<BottomSheet\.CTA/);
    }
  });

  it("AC-3/7/11: TDS 컴포넌트에 as any·as unknown as 캐스트를 쓰지 않는다", () => {
    for (const file of FILES) {
      const src = source(file);
      expect(src, file).not.toMatch(/\bas any\b/);
      expect(src, file).not.toMatch(/as unknown as/);
    }
  });

  it("AC-1/2: 조건부 항목 시트의 '닫기'는 cta 슬롯에 있고 누르면 시트가 닫힌다", () => {
    const rule = CHECKUP_RULES.find((r) => r.conditional)!;
    const status = {
      itemId: rule.id,
      label: rule.label,
      conditional: true,
      received: false,
    } as unknown as ItemStatus;
    wrap(React.createElement(CheckupItemRow, { profileId: SELF_ID, status, year: 2026, eligibleCount: 3 }));
    fireEvent.click(screen.getByText(rule.label));
    const sheet = screen.getByRole("dialog");
    const cta = sheet.querySelector('[data-slot="cta"]') as HTMLElement;
    expect(cta).not.toBeNull();
    const close = within(cta).getByRole("button", { name: "닫기" });
    expect(within(sheet).getAllByRole("button", { name: "닫기" })).toHaveLength(1);
    fireEvent.click(close);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("AC-5/6: 가족 시트의 '정보 수정'은 cta 슬롯에 있고 /profile/{id}/edit로 이동한다", () => {
    wrap(React.createElement(FamilyChecklistSheet, { profileId: SELF_ID, onClose: vi.fn() }));
    const sheet = screen.getByRole("dialog");
    const cta = sheet.querySelector('[data-slot="cta"]') as HTMLElement;
    expect(cta).not.toBeNull();
    const edit = within(cta).getByRole("button", { name: "정보 수정" });
    expect(within(sheet).getAllByRole("button", { name: "정보 수정" })).toHaveLength(1);
    fireEvent.click(edit);
    expect(mockNavigate).toHaveBeenCalledWith(`/profile/${SELF_ID}/edit`);
  });

  it("AC-9/10: 검진 기준 시트의 '닫기'는 cta 슬롯에 있고 누르면 시트가 닫힌다", () => {
    wrap(React.createElement(HomeFooterActions, { selfId: SELF_ID }));
    fireEvent.click(screen.getByRole("button", { name: /검진 기준과 출처/ }));
    const sheet = screen.getByRole("dialog");
    const cta = sheet.querySelector('[data-slot="cta"]') as HTMLElement;
    expect(cta).not.toBeNull();
    expect(within(cta).getByRole("button", { name: "닫기" })).toBeInTheDocument();
    expect(within(sheet).getAllByRole("button", { name: "닫기" })).toHaveLength(1);
    fireEvent.click(within(cta).getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("AC-4/8/12: 공용 목의 BottomSheet는 cta 슬롯과 BottomSheet.CTA·DoubleCTA를 벤더 모양으로 그린다", async () => {
    const tds = await import("@toss/tds-mobile");
    const { BottomSheet } = tds as any;
    render(
      React.createElement(
        BottomSheet,
        { open: true, header: "제목", cta: React.createElement(BottomSheet.CTA, null, "확인") },
        React.createElement("p", null, "본문"),
      ),
    );
    const sheet = screen.getByRole("dialog");
    expect(within(sheet.querySelector('[data-slot="cta"]') as HTMLElement).getByRole("button", { name: "확인" })).toBeInTheDocument();
    expect(typeof BottomSheet.DoubleCTA).toBe("function");
  });
});
