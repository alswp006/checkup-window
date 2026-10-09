import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { BottomSheet, Button, Spacing } from "@toss/tds-mobile";
import CheckupItemRow from "@/components/home/CheckupItemRow";
import { useCheckupStore } from "@/data/useCheckupStore";
import { evaluateProfile, isEvaluable } from "@/domain/checkup";

interface FamilyChecklistSheetProps {
  /** 열 가족의 id. null이면 닫힌 상태. */
  profileId: string | null;
  onClose: () => void;
}

function tickWeak(): void {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    // 브릿지 없는 환경 — 햅틱은 생략한다.
  }
}

/** 가족 한 명의 올해 검진 항목을 보여 주는 시트. 없는 id·판정 불가 출생연도면 아무것도 그리지 않는다. */
export default function FamilyChecklistSheet({ profileId, onClose }: FamilyChecklistSheetProps) {
  const navigate = useNavigate();
  const { profiles, records } = useCheckupStore();
  const profile = profileId === null ? undefined : profiles.find((p) => p.id === profileId);

  const result = useMemo(() => {
    const today = new Date();
    if (!profile || !isEvaluable(profile.birthYear, today)) return null;
    return evaluateProfile(profile, records, today);
  }, [profile, records]);

  if (!profile || !result) return null;

  const edit = () => {
    tickWeak();
    navigate(`/profile/${profile.id}/edit`);
  };

  return (
    <BottomSheet open onClose={onClose} header={<BottomSheet.Header>{profile.name}</BottomSheet.Header>}>
      {result.items.map((item) => (
        <CheckupItemRow
          key={item.itemId}
          profileId={profile.id}
          status={item}
          year={result.year}
          eligibleCount={result.eligibleCount}
        />
      ))}
      <Spacing size={16} />
      <Button display="block" variant="weak" onClick={edit}>
        정보 수정
      </Button>
    </BottomSheet>
  );
}
