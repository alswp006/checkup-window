import { useEffect, useRef, useState } from "react";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { Badge, Button, Paragraph, Spacing } from "@toss/tds-mobile";
import { Card } from "@/components/Card";
import { bannerView } from "@/domain/banner";
import { useCheckupStore } from "@/data/useCheckupStore";
import { logImpression } from "@/lib/analytics";
import type { ProfileResult } from "@/lib/types";

interface DeadlineBannerProps {
  result: ProfileResult;
  today: Date;
}

function tickWeak(): void {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    // 브릿지 없는 환경 — 햅틱은 생략한다.
  }
}

function currentMonth(today: Date): string {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

/** 7~12월 마감 배너 — 노출 판정은 bannerView만 따른다. */
export default function DeadlineBanner({ result, today }: DeadlineBannerProps) {
  const { status, banner, dismissBanner } = useCheckupStore();
  const [dismissed, setDismissed] = useState(false);
  const logged = useRef(false);

  const view = status === "ready" && !dismissed ? bannerView(result, banner, today) : null;
  const visible = view !== null;

  useEffect(() => {
    if (!visible || logged.current) return;
    logged.current = true;
    logImpression("deadline_banner");
  }, [visible]);

  if (!view) return null;

  const dismiss = () => {
    tickWeak();
    dismissBanner(currentMonth(today));
    setDismissed(true);
  };

  return (
    <Card testId="deadline-banner">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Paragraph.Text typography="t5">{view.title}</Paragraph.Text>
        {view.urgent && (
          <Badge size="small" variant="fill" color="red">
            마감 임박
          </Badge>
        )}
      </div>
      <Spacing size={4} />
      <Paragraph.Text typography="t7" color="var(--adaptiveGrey600)">
        {view.body}
      </Paragraph.Text>
      {view.urgentText && (
        <>
          <Spacing size={4} />
          <Paragraph.Text typography="t7">{view.urgentText}</Paragraph.Text>
        </>
      )}
      <Spacing size={8} />
      <div>
        <Button size="small" variant="weak" color="dark" onClick={dismiss}>
          닫기
        </Button>
      </div>
    </Card>
  );
}
