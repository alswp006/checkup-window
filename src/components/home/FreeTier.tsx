import { useEffect, useRef } from "react";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { Asset, Button, Paragraph, Spacing } from "@toss/tds-mobile";
import { Card } from "@/components/Card";
import { CountUp } from "@/components/CountUp";
import { MiniBar } from "@/components/MiniBar";
import { EmptyState } from "@/components/StateView";
import { SummaryHero } from "@/components/SummaryHero";
import CheckupItemRow from "@/components/home/CheckupItemRow";
import { emptyStateText, heroCaption } from "@/domain/format";
import { logClick, logImpression } from "@/lib/analytics";
import { shareApp } from "@/lib/share";
import type { ProfileResult } from "@/lib/types";

interface FreeTierProps {
  result: ProfileResult;
  profileId: string;
}

const DISCLAIMER = "정확한 대상 여부는 국민건강보험공단 안내를 확인하세요";

function tickWeak(): void {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    // 브릿지 없는 환경 — 햅틱은 생략한다.
  }
}

/** 본인 결과 블록 — 광고 상태와 무관하게 항상 렌더한다. */
export default function FreeTier({ result, profileId }: FreeTierProps) {
  const { eligibleCount, receivedCount, year } = result;
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    logImpression("result_free_tier");
  }, []);

  const share = () => {
    logClick("share_result");
    tickWeak();
    void shareApp({ message: "올해 받을 국가검진을 확인했어요", path: "/" });
  };

  const empty = emptyStateText(result);

  return (
    <div data-testid="free-tier">
      {eligibleCount === 0 ? (
        <EmptyState
          icon={<Asset.ContentIcon name="iconCalendarRegular" alt="" style={{ width: 48, height: 48 }} />}
          title={empty.title}
          description={empty.description}
        />
      ) : (
        <div data-testid="summary-hero">
          <SummaryHero
            label="올해 받을 국가검진"
            value={<CountUp value={eligibleCount} unit="개" prefix="올해 대상 " typography="t1" />}
            caption={heroCaption(result)}
          />
          <Spacing size={8} />
          <MiniBar ratio={receivedCount / eligibleCount} />
        </div>
      )}
      <Spacing size={16} />
      <Card>
        {result.items.map((item) => (
          <CheckupItemRow
            key={item.itemId}
            profileId={profileId}
            status={item}
            year={year}
            eligibleCount={eligibleCount}
          />
        ))}
      </Card>
      <Spacing size={12} />
      <Paragraph.Text typography="t7" color="var(--adaptiveGrey600)">
        {DISCLAIMER}
      </Paragraph.Text>
      <Spacing size={16} />
      <Button variant="weak" size="large" display="block" onClick={share}>
        결과 공유하기
      </Button>
    </div>
  );
}
