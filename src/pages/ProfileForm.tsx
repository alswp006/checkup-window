import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Loader, Paragraph, Spacing, Top, useToast } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SubmitFooter } from "@/components/BottomCTA";
import { useCheckupStore } from "@/data/useCheckupStore";
import { logClick } from "@/lib/analytics";
import type { HomeLocationState, Profile, ProfileFormLocationState, StoreResult } from "@/lib/types";
import DeleteProfileButton from "@/pages/profileForm/DeleteProfileButton";
import ProfileFormFields from "@/pages/profileForm/ProfileFormFields";
import { FAMILY_LIMIT, validateProfileForm } from "@/pages/profileForm/validate";
import type { ProfileFormErrors, ProfileFormValues } from "@/pages/profileForm/validate";

const TITLE = <Top.TitleParagraph>올해검진</Top.TitleParagraph>;
const SELF_NAME = "나";

const FAILURE_TOAST: Record<Extract<StoreResult, { ok: false }>["error"], string> = {
  STORAGE_FULL: "저장 공간이 부족해 저장하지 못했어요",
  FAMILY_LIMIT: `가족은 최대 ${FAMILY_LIMIT}명까지 추가할 수 있어요`,
  DUPLICATE_NAME: "이미 같은 이름의 프로필이 있어요",
  SELF_EXISTS: "내 정보는 이미 등록돼 있어요",
};

/** 라우트 state를 읽는다 — 모양이 틀리면 null로 본다. */
function parseState(raw: unknown): ProfileFormLocationState {
  if (typeof raw !== "object" || raw === null) return null;
  const mode = (raw as { mode?: unknown }).mode;
  return mode === "self" || mode === "family" ? { mode } : null;
}

function valuesOf(profile: Profile): ProfileFormValues {
  return {
    name: profile.name,
    birthYear: String(profile.birthYear),
    sex: profile.sex,
    insuranceType: profile.insuranceType,
  };
}

/** 프로필 입력·수정 — /profile/new, /profile/:profileId/edit */
export default function ProfileForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profileId } = useParams<{ profileId: string }>();
  const { openToast } = useToast();
  const store = useCheckupStore();
  const [draft, setDraft] = useState<ProfileFormValues | null>(null);
  const [submitted, setSubmitted] = useState(false);
  // 저장·삭제로 스스로 이동하는 중에는 '없는 프로필' 리다이렉트가 state를 덮어쓰지 않게 한다.
  const leaving = useRef(false);

  const isEdit = profileId !== undefined;
  const ready = store.status === "ready";
  const editing = isEdit ? store.profiles.find((p) => p.id === profileId) : undefined;
  const missing = ready && isEdit && !editing;

  useEffect(() => {
    if (missing && !leaving.current) navigate("/", { replace: true });
  }, [missing, navigate]);

  if (!ready) {
    return (
      <ScreenScaffold top={<Top title={TITLE} />}>
        <Loader />
      </ScreenScaffold>
    );
  }
  if (isEdit && !editing) {
    return <ScreenScaffold top={<Top title={TITLE} />}>{null}</ScreenScaffold>;
  }

  const hasSelf = store.profiles.some((p) => p.role === "self");
  const mode: Profile["role"] = editing
    ? editing.role
    : (parseState(location.state)?.mode ?? (hasSelf ? "family" : "self"));
  const others = store.profiles.filter((p) => p.id !== editing?.id);
  const familyCount = others.filter((p) => p.role === "family").length;
  const familyLimitReached = !editing && mode === "family" && familyCount >= FAMILY_LIMIT;

  const base: ProfileFormValues = editing
    ? valuesOf(editing)
    : { name: mode === "self" ? SELF_NAME : "", birthYear: "" };
  const values = draft ?? base;

  const validate = (v: ProfileFormValues): ProfileFormErrors =>
    validateProfileForm(v, {
      thisYear: new Date().getFullYear(),
      existingNames: others.map((p) => p.name),
      familyCount,
      mode,
    });
  const errors = submitted ? validate(values) : {};

  const finish = (state: NonNullable<HomeLocationState>) => {
    leaving.current = true;
    navigate("/", { replace: true, state });
  };

  const submit = () => {
    setSubmitted(true);
    const found = validate(values);
    if (Object.keys(found).length > 0) {
      if (found.form) openToast(found.form);
      return;
    }
    if (!values.sex || !values.insuranceType) return;

    logClick("profile_submit");
    const fields = {
      name: (values.name ?? "").trim(),
      birthYear: Number(values.birthYear),
      sex: values.sex,
      insuranceType: values.insuranceType,
    };
    const result = editing
      ? store.updateProfile(editing.id, fields)
      : store.addProfile({ ...fields, role: mode });
    if (!result.ok) {
      openToast(FAILURE_TOAST[result.error]);
      return;
    }
    finish({ toast: "saved" });
  };

  const remove = () => {
    if (!editing) return;
    logClick("profile_delete");
    const result = store.deleteProfile(editing.id);
    if (!result.ok) {
      openToast(FAILURE_TOAST[result.error]);
      return;
    }
    finish({ toast: "deleted" });
  };

  const subtitle = editing ? "정보 수정" : mode === "self" ? "내 정보 입력" : "가족 추가";

  return (
    <ScreenScaffold
      top={<Top title={TITLE} />}
      bottom={
        <SubmitFooter
          label={editing ? "저장" : "결과 보기"}
          disabled={familyLimitReached}
          hint={familyLimitReached ? `가족은 최대 ${FAMILY_LIMIT}명까지 추가할 수 있어요` : undefined}
          onClick={submit}
        />
      }
    >
      <Paragraph.Text typography="t5">{subtitle}</Paragraph.Text>
      <Spacing size={16} />
      <ProfileFormFields values={values} onChange={setDraft} errors={errors} />
      {editing && editing.role === "family" && (
        <>
          <Spacing size={24} />
          <DeleteProfileButton name={editing.name} onConfirm={remove} />
        </>
      )}
      <Spacing size={96} />
    </ScreenScaffold>
  );
}
