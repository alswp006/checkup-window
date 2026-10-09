import { useState } from "react";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { Button, ConfirmDialog } from "@toss/tds-mobile";

interface DeleteProfileButtonProps {
  name: string;
  /** 다이얼로그에서 '삭제'를 눌렀을 때 — 실제 삭제·이동은 부모가 맡는다. */
  onConfirm: () => void;
}

function tickWeak(): void {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    // 브릿지 없는 환경 — 햅틱은 생략한다.
  }
}

/** 가족 수정 모드 전용 삭제 버튼 + 확인 다이얼로그. 콜백만 받는다. */
export default function DeleteProfileButton({ name, onConfirm }: DeleteProfileButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button color="danger" variant="weak" display="block" onClick={() => setOpen(true)}>
        삭제
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={<ConfirmDialog.Title>{`${name} 프로필을 삭제할까요?`}</ConfirmDialog.Title>}
        description={<ConfirmDialog.Description>체크 기록도 함께 지워져요</ConfirmDialog.Description>}
        cancelButton={<ConfirmDialog.CancelButton onClick={() => setOpen(false)}>취소</ConfirmDialog.CancelButton>}
        confirmButton={
          <ConfirmDialog.ConfirmButton
            onClick={() => {
              tickWeak();
              setOpen(false);
              onConfirm();
            }}
          >
            삭제
          </ConfirmDialog.ConfirmButton>
        }
      />
    </>
  );
}
