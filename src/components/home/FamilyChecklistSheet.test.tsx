import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { mockAnalytics, mockNavigate, mockRouter, mockTds } from "@/__tests__/__helpers__/mocks";
import type { CheckupItemId, CheckupRecord, Profile, StoreResult } from "@/lib/types";
import FamilyChecklistSheet from "@/components/home/FamilyChecklistSheet";

vi.mock("@apps-in-toss/web-framework", () => ({ generateHapticFeedback: vi.fn() }));

mockTds();
mockRouter();
mockAnalytics();

const NOW = "2026-10-10T00:00:00.000Z";
const MOM: Profile = {
  id: "mom-1",
  name: "엄마",
  role: "family",
  birthYear: 1966,
  sex: "female",
  insuranceType: "dependent",
  createdAt: NOW,
  updatedAt: NOW,
};

const mockToggleRecord = vi.fn<(profileId: string, itemId: CheckupItemId, year: number) => StoreResult>();
let mockProfiles: Profile[] = [];
let mockRecords: CheckupRecord[] = [];
vi.mock("@/data/useCheckupStore", () => ({
  useCheckupStore: () => ({ status: "ready", profiles: mockProfiles, records: mockRecords, toggleRecord: mockToggleRecord }),
}));

function renderSheet(profileId: string | null, onClose = vi.fn()) {
  return render(
    <MemoryRouter>
      <FamilyChecklistSheet profileId={profileId} onClose={onClose} />
    </MemoryRouter>,
  );
}

describe("FamilyChecklistSheet", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-10T09:00:00+09:00"));
    mockProfiles = [MOM];
    mockRecords = [];
    mockToggleRecord.mockReset();
    mockToggleRecord.mockReturnValue({ ok: true });
    mockNavigate.mockReset();
  });

  it("가족 이름 헤더와 항목 행 7개를 보여 준다", () => {
    renderSheet("mom-1");
    const sheet = within(screen.getByRole("dialog"));
    expect(sheet.getByText("엄마")).toBeInTheDocument();
    expect(sheet.getAllByTestId(/^checkup-item-/)).toHaveLength(7);
  });

  it("Switch를 켜면 가족 id로 올해 기록을 저장한다", () => {
    renderSheet("mom-1");
    fireEvent.click(within(screen.getByRole("dialog")).getAllByRole("switch")[0]);
    expect(mockToggleRecord).toHaveBeenCalledTimes(1);
    expect(mockToggleRecord.mock.calls[0][0]).toBe("mom-1");
    expect(mockToggleRecord.mock.calls[0][2]).toBe(2026);
  });

  it("정보 수정은 edit 경로로 이동한다", () => {
    renderSheet("mom-1");
    fireEvent.click(screen.getByRole("button", { name: "정보 수정" }));
    expect(mockNavigate).toHaveBeenCalledWith("/profile/mom-1/edit");
  });

  it("profileId가 null이거나 없는 id면 그리지 않는다", () => {
    for (const id of [null, "ghost-id"]) {
      const { unmount } = renderSheet(id);
      expect(screen.queryByRole("dialog")).toBeNull();
      unmount();
    }
  });
});
