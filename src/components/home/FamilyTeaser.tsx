import { ListRow } from "@toss/tds-mobile";
import type { Profile } from "@/lib/types";

interface FamilyTeaserProps {
  family: Profile[];
}

/** 리워드 게이트 밖에 두는 가족 이름 줄 — 잠긴 내용이 무엇인지 미리 보여 준다. */
export default function FamilyTeaser({ family }: FamilyTeaserProps) {
  const bottom =
    family.length > 0 ? `등록한 가족: ${family.map((f) => f.name).join(" · ")}` : "가족을 추가해 함께 확인해요";

  return <ListRow contents={<ListRow.Texts type="2RowTypeA" top="가족" bottom={bottom} />} />;
}
