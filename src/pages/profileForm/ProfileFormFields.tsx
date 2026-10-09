import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { Asset, Chip, ChipItem, ListRow, Paragraph, Spacing, TextField } from "@toss/tds-mobile";
import { INSURANCE_OPTIONS } from "@/domain/rules";
import type { Sex } from "@/lib/types";
import type { ProfileFormErrors, ProfileFormValues } from "./validate";

interface ProfileFormFieldsProps {
  values: ProfileFormValues;
  onChange: (next: ProfileFormValues) => void;
  errors?: ProfileFormErrors;
}

const SEX_OPTIONS: readonly { value: Sex; label: string }[] = [
  { value: "male", label: "남성" },
  { value: "female", label: "여성" },
];

function tickWeak(): void {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    // 브릿지 없는 환경 — 햅틱은 생략한다.
  }
}

/** 프로필 폼 본문 — controlled. 저장·라우팅은 부모(S2 페이지)가 맡는다. */
export default function ProfileFormFields({ values, onChange, errors = {} }: ProfileFormFieldsProps) {
  const set = (patch: Partial<ProfileFormValues>) => onChange({ ...values, ...patch });

  return (
    <div>
      <TextField
        variant="line"
        label="이름"
        labelOption="sustain"
        placeholder="예: 엄마"
        maxLength={10}
        enterKeyHint="next"
        value={values.name ?? ""}
        onChange={(e) => set({ name: e.target.value })}
        hasError={!!errors.name}
        help={errors.name}
      />
      <Spacing size={12} />
      <TextField
        variant="line"
        label="출생연도"
        labelOption="sustain"
        placeholder="예: 1990"
        inputMode="numeric"
        enterKeyHint="done"
        maxLength={4}
        value={values.birthYear}
        onChange={(e) => set({ birthYear: e.target.value.replace(/\D/g, "").slice(0, 4) })}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        hasError={!!errors.birthYear}
        help={errors.birthYear}
      />
      <Spacing size={20} />
      <Paragraph typography="t6" color="var(--adaptiveGrey700)">
        성별
      </Paragraph>
      <Spacing size={8} />
      <Chip kind="select">
        {SEX_OPTIONS.map((o) => (
          <ChipItem
            key={o.value}
            selected={values.sex === o.value}
            onClick={() => {
              tickWeak();
              set({ sex: o.value });
            }}
          >
            {o.label}
          </ChipItem>
        ))}
      </Chip>
      {errors.sex && (
        <>
          <Spacing size={4} />
          <Paragraph typography="t7" color="var(--adaptiveRed500)">
            {errors.sex}
          </Paragraph>
        </>
      )}
      <Spacing size={20} />
      <Paragraph typography="t6" color="var(--adaptiveGrey700)">
        가입 유형
      </Paragraph>
      <div role="group" aria-label="가입 유형">
        {INSURANCE_OPTIONS.map((o) => {
          const selected = values.insuranceType === o.value;
          return (
            <ListRow
              key={o.value}
              aria-pressed={selected}
              onClick={() => {
                tickWeak();
                set({ insuranceType: o.value });
              }}
              contents={<ListRow.Texts type="2RowTypeA" top={o.label} bottom={o.description} />}
              right={
                selected ? (
                  <Asset.Icon
                    name="icon-check"
                    color="var(--adaptiveBlue500)"
                    frameShape={{ width: 24, height: 24 }}
                    aria-hidden
                  />
                ) : null
              }
            />
          );
        })}
      </div>
      {errors.insuranceType && (
        <Paragraph typography="t7" color="var(--adaptiveRed500)">
          {errors.insuranceType}
        </Paragraph>
      )}
    </div>
  );
}
