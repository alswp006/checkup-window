import { Loader, Spacing, Top } from "@toss/tds-mobile";
import { AdSlot } from "@/components/AdSlot";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { TossRewardAd } from "@/components/TossRewardAd";
import DeadlineBanner from "@/components/home/DeadlineBanner";
import FamilyTeaser from "@/components/home/FamilyTeaser";
import FreeTier from "@/components/home/FreeTier";
import HomeFooterActions from "@/components/home/HomeFooterActions";
import LockedTier from "@/components/home/LockedTier";
import { useHomeBootstrap } from "@/pages/home/useHomeBootstrap";
import type { ProfileResult } from "@/lib/types";

const TITLE = <Top.TitleParagraph>올해검진</Top.TitleParagraph>;

/** 홈(결과) — 무료 층은 게이트 바깥, 더 깊은 층(LockedTier)만 TossRewardAd 안에 둔다. */
export default function Home() {
  const { phase, self, selfResult, family, familyResults, invalidFamily } = useHomeBootstrap();

  if (phase !== "ready" || !self || !selfResult) {
    return (
      <ScreenScaffold top={<Top title={TITLE} />}>
        {phase === "loading" && <Loader />}
      </ScreenScaffold>
    );
  }

  const invalidIds = new Set(invalidFamily.map((p) => p.id));
  const resultById: Record<string, ProfileResult | null> = {};
  for (const p of family) {
    resultById[p.id] = invalidIds.has(p.id) ? null : (familyResults.find((r) => r.profileId === p.id) ?? null);
  }

  const adGroupId = import.meta.env.VITE_TOSS_AD_GROUP_ID as string | undefined;
  const slotId = (import.meta.env.VITE_TOSS_AD_SLOT_ID as string | undefined) ?? "";

  return (
    <ScreenScaffold top={<Top title={TITLE} />}>
      <DeadlineBanner result={selfResult} today={new Date()} />
      <Spacing size={16} />
      <FreeTier result={selfResult} profileId={self.id} />
      <Spacing size={24} />
      {adGroupId ? <AdSlot adGroupId={adGroupId} /> : null}
      <Spacing size={16} />
      <FamilyTeaser family={family} />
      <TossRewardAd slotId={slotId}>
        <LockedTier self={self} family={family} selfResult={selfResult} familyResults={resultById} />
      </TossRewardAd>
      <Spacing size={32} />
      <HomeFooterActions selfId={self.id} />
    </ScreenScaffold>
  );
}
