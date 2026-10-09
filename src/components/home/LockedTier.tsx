import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { Asset, Button, ListRow, Paragraph, Spacing } from "@toss/tds-mobile";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/StateView";
import FamilyChecklistSheet from "@/components/home/FamilyChecklistSheet";
import { useCheckupStore } from "@/data/useCheckupStore";
import { isEvaluable } from "@/domain/checkup";
import { buildPlan, familySummary, invalidFamilyLine, planLines } from "@/domain/plan";
import { logClick, logImpression } from "@/lib/analytics";
import type { PlanYear, Profile, ProfileFormLocationState, ProfileResult } from "@/lib/types";

interface LockedTierProps {
  self: Profile;
  family: Profile[];
  selfResult: ProfileResult;
  /** 가족 id → 결과. 출생연도 오류로 판정하지 못한 가족은 null. */
  familyResults: Record<string, ProfileResult | null>;
}

const PLAN_YEARS = 3;

function tickWeak(): void {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    // 브릿지 없는 환경 — 햅틱은 생략한다.
  }
}

/** 리워드 게이트 안쪽 블록 — 3개년 계획과 가족별 올해 결과. */
export default function LockedTier({ self, family, familyResults }: LockedTierProps) {
  const navigate = useNavigate();
  const { records } = useCheckupStore();
  const [sheetId, setSheetId] = useState<string | null>(null);
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    logImpression("reward_locked_tier");
  }, []);

  const people = useMemo(() => [self, ...family], [self, family]);

  const cards = useMemo(() => {
    const today = new Date();
    const startYear = today.getFullYear();
    const plans = people.map((p) => ({ profile: p, plan: buildPlan(p, records, today, PLAN_YEARS) }));
    return Array.from({ length: PLAN_YEARS }, (_, i) => {
      const year = startYear + i;
      const lines = plans.map(({ profile, plan }) => {
        if (!isEvaluable(profile.birthYear, today)) return `${profile.name} — 출생연도를 확인해주세요`;
        const entry: PlanYear | undefined = plan.find((y) => y.year === year);
        return entry ? (planLines({ [profile.id]: entry }, [profile])[0] ?? "") : "";
      });
      return { year, lines: lines.filter((l) => l !== "") };
    });
  }, [people, records]);

  const openFamily = (f: Profile) => {
    tickWeak();
    if (familyResults[f.id]) {
      setSheetId(f.id);
    } else {
      navigate(`/profile/${f.id}/edit`);
    }
  };

  const addFamily = () => {
    logClick("family_add");
    tickWeak();
    const state: ProfileFormLocationState = { mode: "family" };
    navigate("/profile/new", { state });
  };

  return (
    <div data-testid="locked-tier">
      <Paragraph.Text typography="t4">3년 검진 계획</Paragraph.Text>
      <Spacing size={12} />
      {cards.map((c, i) => (
        <Fragment key={c.year}>
          {i > 0 ? <Spacing size={12} /> : null}
          <Card testId={`plan-year-${c.year}`}>
            <Paragraph.Text typography="t5">{c.year}년</Paragraph.Text>
            {c.lines.map((line) => (
              <Fragment key={line}>
                <Spacing size={4} />
                <Paragraph.Text typography="t7" style={{ overflowWrap: "break-word" }}>
                  {line}
                </Paragraph.Text>
              </Fragment>
            ))}
          </Card>
        </Fragment>
      ))}
      <Spacing size={24} />
      <Paragraph.Text typography="t4">가족 올해 결과</Paragraph.Text>
      <Spacing size={12} />
      {family.length === 0 ? (
        <EmptyState
          icon={<Asset.ContentIcon name="iconCalendarRegular" alt="" />}
          title="가족을 추가하면 함께 볼 수 있어요"
        />
      ) : (
        family.map((f) => {
          const result = familyResults[f.id];
          const line = result ? `${f.name} · ${familySummary(result)}` : invalidFamilyLine(f.name);
          return (
            <ListRow
              key={f.id}
              onClick={() => openFamily(f)}
              contents={<ListRow.Texts type="1RowTypeA" top={line} />}
            />
          );
        })
      )}
      <Spacing size={12} />
      <Button display="block" variant="weak" onClick={addFamily}>
        가족 추가
      </Button>
      <FamilyChecklistSheet profileId={sheetId} onClose={() => setSheetId(null)} />
    </div>
  );
}
