import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { BottomSheet, Button, ConfirmDialog, ListRow, Spacing, useToast } from "@toss/tds-mobile";
import { useCheckupStore } from "@/data/useCheckupStore";
import { CHECKUP_RULES, formatRuleLine } from "@/domain/rules";
import { logClick } from "@/lib/analytics";

interface HomeFooterActionsProps {
  /** 본인 프로필 id — '내 정보 수정'이 이 프로필의 수정 화면으로 간다. */
  selfId: string;
}

function tickWeak(): void {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    // 브릿지 없는 환경 — 햅틱은 생략한다.
  }
}

/** 홈 하단 관리 행 3개: 내 정보 수정 · 검진 기준과 출처(텍스트만) · 데이터 초기화. */
export default function HomeFooterActions({ selfId }: HomeFooterActionsProps) {
  const navigate = useNavigate();
  const { resetAll } = useCheckupStore();
  const { openToast } = useToast();
  const [ruleOpen, setRuleOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const editSelf = () => {
    tickWeak();
    navigate(`/profile/${selfId}/edit`);
  };

  const openRuleSheet = () => {
    tickWeak();
    setRuleOpen(true);
  };

  const openResetDialog = () => {
    tickWeak();
    setResetOpen(true);
  };

  const confirmReset = () => {
    logClick("data_reset_confirm");
    setResetOpen(false);
    const result = resetAll();
    if (!result.ok) {
      openToast("초기화하지 못했어요. 다시 시도해주세요");
      return;
    }
    navigate("/profile/new", { replace: true, state: { mode: "self" } });
  };

  return (
    <>
      <ListRow onClick={editSelf} contents={<ListRow.Texts type="1RowTypeA" top="내 정보 수정" />} withArrow />
      <ListRow onClick={openRuleSheet} contents={<ListRow.Texts type="1RowTypeA" top="검진 기준과 출처" />} withArrow />
      <ListRow onClick={openResetDialog} contents={<ListRow.Texts type="1RowTypeA" top="데이터 초기화" />} />

      <BottomSheet
        open={ruleOpen}
        onClose={() => setRuleOpen(false)}
        header={<BottomSheet.Header>검진 기준과 출처</BottomSheet.Header>}
      >
        {CHECKUP_RULES.map((rule) => (
          <ListRow
            key={rule.id}
            contents={<ListRow.Texts type="2RowTypeA" top={rule.label} bottom={formatRuleLine(rule.id)} />}
          />
        ))}
        <Spacing size={16} />
        <Button display="block" variant="weak" onClick={() => setRuleOpen(false)}>
          닫기
        </Button>
      </BottomSheet>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title={<ConfirmDialog.Title>모든 프로필과 체크 기록을 지울까요?</ConfirmDialog.Title>}
        cancelButton={<ConfirmDialog.CancelButton onClick={() => setResetOpen(false)}>취소</ConfirmDialog.CancelButton>}
        confirmButton={<ConfirmDialog.ConfirmButton onClick={confirmReset}>초기화</ConfirmDialog.ConfirmButton>}
      />
    </>
  );
}
