import { useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@toss/tds-mobile";
import { useCheckupStore } from "@/data/useCheckupStore";
import { evaluateAll, buildPlan } from "@/domain/plan";
import { isEvaluable } from "@/domain/checkup";
import type { HomeLocationState, PlanYear, Profile, ProfileResult } from "@/lib/types";

export type HomePhase = "loading" | "redirect" | "ready";

export interface HomeBootstrap {
  phase: HomePhase;
  self: Profile | null;
  selfResult: ProfileResult | null;
  family: Profile[];
  familyResults: ProfileResult[];
  /** 출생연도가 범위를 벗어나 판정할 수 없는 가족 */
  invalidFamily: Profile[];
  plan: PlanYear[];
}

const PLAN_YEARS = 3;
const TOAST_TEXT = { saved: "저장했어요", deleted: "삭제했어요" } as const;
const RECOVERED_TEXT = "저장된 정보를 불러오지 못해 새로 시작해요";

/** location.state가 HomeLocationState 모양이 아니면 null. */
function parseState(state: unknown): HomeLocationState {
  if (typeof state !== "object" || state === null) return null;
  const toast = (state as { toast?: unknown }).toast;
  return toast === "saved" || toast === "deleted" ? { toast } : null;
}

export function useHomeBootstrap(): HomeBootstrap {
  const { status, profiles, records, recovered } = useCheckupStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { openToast } = useToast();

  const routeState = parseState(location.state);
  const toastKey = routeState?.toast ?? null;

  const data = useMemo(() => {
    const today = new Date();
    const self = profiles.find((p) => p.role === "self") ?? null;
    const family = profiles.filter((p) => p.role === "family");
    const { results, invalidIds } = evaluateAll(profiles, records, today);
    const selfResult = self ? (results.find((r) => r.profileId === self.id) ?? null) : null;
    const familyResults = family
      .map((p) => results.find((r) => r.profileId === p.id))
      .filter((r): r is ProfileResult => r !== undefined);
    const invalidFamily = family.filter((p) => invalidIds.includes(p.id));
    const plan = self && isEvaluable(self.birthYear, today) ? buildPlan(self, records, today, PLAN_YEARS) : [];
    return { self, family, selfResult, familyResults, invalidFamily, plan };
  }, [profiles, records]);

  const { self, selfResult } = data;

  let phase: HomePhase = "ready";
  if (status === "loading") phase = "loading";
  else if (!self || !selfResult) phase = "redirect";

  const redirectTo = phase === "redirect" ? (self ? self.id : null) : undefined;
  useEffect(() => {
    if (redirectTo === undefined) return;
    if (redirectTo === null) navigate("/profile/new", { replace: true, state: { mode: "self" } });
    else navigate(`/profile/${redirectTo}/edit`, { replace: true });
  }, [redirectTo, navigate]);

  const toastShown = useRef<string | null>(null);
  useEffect(() => {
    if (status !== "ready" || toastKey === null || toastShown.current === toastKey) return;
    toastShown.current = toastKey;
    openToast(TOAST_TEXT[toastKey]);
    navigate(".", { replace: true, state: null });
  }, [status, toastKey, openToast, navigate]);

  const recoveredShown = useRef(false);
  useEffect(() => {
    if (status !== "ready" || !recovered || recoveredShown.current) return;
    recoveredShown.current = true;
    openToast(RECOVERED_TEXT);
  }, [status, recovered, openToast]);

  return { phase, ...data };
}
