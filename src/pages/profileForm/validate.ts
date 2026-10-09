import type { Profile } from "@/lib/types";

export const MIN_BIRTH_YEAR = 1920;
export const FAMILY_LIMIT = 9;

/** 폼 입력값 — 출생연도는 입력 중 문자열 그대로 둔다. */
export type ProfileFormValues = Partial<Pick<Profile, "name" | "sex" | "insuranceType">> & { birthYear: string };

export interface ProfileFormContext {
  thisYear: number;
  /** 중복 검사 대상 이름 — 수정 모드면 호출부가 자기 이름을 빼고 넘긴다. */
  existingNames: string[];
  familyCount: number;
  mode: Profile["role"];
}

/** 필드별 에러 문구. form은 특정 칸이 아닌 폼 전체 제한(가족 인원)이다. 에러가 없으면 키가 없다. */
export type ProfileFormErrors = Partial<Record<"name" | "birthYear" | "sex" | "insuranceType" | "form", string>>;

export function validateProfileForm(values: ProfileFormValues, ctx: ProfileFormContext): ProfileFormErrors {
  const errors: ProfileFormErrors = {};

  const name = (values.name ?? "").trim();
  if (!name) errors.name = "이름을 입력해주세요";
  else if (ctx.existingNames.some((n) => n.trim() === name)) errors.name = "이미 같은 이름의 프로필이 있어요";

  if (!/^\d{4}$/.test(values.birthYear)) {
    errors.birthYear = "출생연도 4자리를 입력해주세요";
  } else {
    const year = Number(values.birthYear);
    if (year < MIN_BIRTH_YEAR || year > ctx.thisYear) {
      errors.birthYear = `${MIN_BIRTH_YEAR}~${ctx.thisYear}년 사이로 입력해주세요`;
    }
  }

  if (!values.sex) errors.sex = "성별을 선택해주세요";
  if (!values.insuranceType) errors.insuranceType = "가입 유형을 선택해주세요";

  if (ctx.mode === "family" && ctx.familyCount >= FAMILY_LIMIT) {
    errors.form = `가족은 최대 ${FAMILY_LIMIT}명까지 추가할 수 있어요`;
  }

  return errors;
}
