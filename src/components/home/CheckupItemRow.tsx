import { useState } from "react";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { BottomSheet, Badge, ListRow, Paragraph, Spacing, Switch, useToast } from "@toss/tds-mobile";
import { useCheckupStore } from "@/data/useCheckupStore";
import { CHECKUP_RULES } from "@/domain/rules";
import { canToggle, itemDescription } from "@/domain/format";
import { logClick } from "@/lib/analytics";
import { requestReviewOnce } from "@/lib/review";
import type { ItemStatus } from "@/lib/types";

interface CheckupItemRowProps {
  profileId: string;
  status: ItemStatus;
  year: number;
  /** 비조건부 올해 대상 수 — 조건부 항목의 Switch 노출 판정에 쓴다. */
  eligibleCount: number;
}

function tickWeak(): void {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    // 브릿지 없는 환경 — 햅틱은 생략한다.
  }
}

export default function CheckupItemRow({ profileId, status, year, eligibleCount }: CheckupItemRowProps) {
  const { toggleRecord } = useCheckupStore();
  const { openToast } = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const rule = status.conditional ? CHECKUP_RULES.find((r) => r.id === status.itemId) : undefined;

  const toggle = () => {
    const turningOn = !status.received;
    logClick("checkup_received_toggle");
    tickWeak();
    const result = toggleRecord(profileId, status.itemId, year);
    if (!result.ok) {
      // checked는 status.received로 제어되므로 저장 실패 시 이전 값 그대로 남는다.
      openToast("저장하지 못했어요. 다시 시도해주세요");
      return;
    }
    if (turningOn) requestReviewOnce();
  };

  return (
    <>
      <ListRow
        data-testid={`checkup-item-${status.itemId}`}
        onClick={status.conditional ? () => setSheetOpen(true) : undefined}
        contents={<ListRow.Texts type="2RowTypeA" top={status.label} bottom={itemDescription(status, year)} />}
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {status.conditional && (
              <Badge size="small" variant="weak" color="elephant">
                조건부
              </Badge>
            )}
            {canToggle(status, eligibleCount) && (
              <div onClick={(e) => e.stopPropagation()}>
                <Switch checked={status.received} onChange={toggle} />
              </div>
            )}
          </div>
        }
      />
      {rule && (
        <BottomSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          header={<BottomSheet.Header>{status.label}</BottomSheet.Header>}
          cta={<BottomSheet.CTA onClick={() => setSheetOpen(false)}>닫기</BottomSheet.CTA>}
        >
          <Paragraph.Text typography="t6">{rule.conditionText}</Paragraph.Text>
          <Spacing size={8} />
          <Paragraph.Text typography="t7" color="var(--adaptiveGrey600)">
            출처: {rule.source}
          </Paragraph.Text>
        </BottomSheet>
      )}
    </>
  );
}
