import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { mockTds } from "@/__tests__/__helpers__/mocks";
import DeleteProfileButton from "@/pages/profileForm/DeleteProfileButton";

vi.mock("@apps-in-toss/web-framework", () => ({ generateHapticFeedback: vi.fn() }));

mockTds();

describe("DeleteProfileButton", () => {
  it("삭제를 누르면 이름이 든 확인 문구가 뜨고, 아직 콜백은 부르지 않는다", () => {
    const onConfirm = vi.fn();
    render(<DeleteProfileButton name="엄마" onConfirm={onConfirm} />);

    expect(screen.queryByRole("alertdialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog.textContent).toContain("엄마 프로필을 삭제할까요?");
    expect(dialog.textContent).toContain("체크 기록도 함께 지워져요");
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("다이얼로그의 삭제를 누르면 onConfirm이 1회 불리고 다이얼로그가 닫힌다", () => {
    const onConfirm = vi.fn();
    render(<DeleteProfileButton name="엄마" onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "삭제" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("닫기를 누르면 콜백 없이 다이얼로그만 닫힌다", () => {
    const onConfirm = vi.fn();
    render(<DeleteProfileButton name="엄마" onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "닫기" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});
