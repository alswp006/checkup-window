import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { BannerState, CheckupItemId, CheckupRecord, Profile, StoreResult } from "@/lib/types";
import { KEYS, isProfileList, isRecordList, readBanner, readEnvelope } from "@/data/storage";
import * as profileRepo from "@/data/profileRepo";
import type { ProfileInput, ProfilePatch, ProfileSnapshot, RepoResult } from "@/data/profileRepo";
import * as recordRepo from "@/data/recordRepo";
import { CheckupStoreContext } from "@/data/useCheckupStore";
import type { CheckupStore } from "@/data/useCheckupStore";

interface State {
  status: "loading" | "ready";
  profiles: Profile[];
  records: CheckupRecord[];
  banner: BannerState;
  recovered: boolean;
}

const INITIAL: State = {
  status: "loading",
  profiles: [],
  records: [],
  banner: { dismissedMonth: null },
  recovered: false,
};

function currentMonth(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function CheckupStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(INITIAL);
  // 액션은 렌더를 기다리지 않고 최신 스냅샷에서 바로 계산한다 (같은 틱에 연속 호출해도 안전).
  const snapshot = useRef<ProfileSnapshot>({ profiles: [], records: [] });

  useEffect(() => {
    const year = new Date().getFullYear();
    const p = readEnvelope<Profile>(KEYS.profiles, (d) => isProfileList(d, year));
    const r = readEnvelope<CheckupRecord>(KEYS.records, isRecordList);
    snapshot.current = { profiles: p.data, records: r.data };
    setState({
      status: "ready",
      profiles: p.data,
      records: r.data,
      banner: readBanner(),
      recovered: p.recovered || r.recovered,
    });
  }, []);

  // 저장이 실패하면 repo가 snapshot을 그대로 돌려주므로 메모리 상태도 바꾸지 않는다.
  const apply = useCallback((run: (snap: ProfileSnapshot, now: string) => RepoResult): StoreResult => {
    const { result, next } = run(snapshot.current, new Date().toISOString());
    if (result.ok) {
      snapshot.current = next;
      setState((s) => ({ ...s, profiles: next.profiles, records: next.records }));
    }
    return result;
  }, []);

  const addProfile = useCallback(
    (input: ProfileInput) => apply((snap, now) => profileRepo.addProfile(snap, input, now)),
    [apply],
  );
  const updateProfile = useCallback(
    (id: string, patch: ProfilePatch) => apply((snap, now) => profileRepo.updateProfile(snap, id, patch, now)),
    [apply],
  );
  const deleteProfile = useCallback((id: string) => apply((snap) => profileRepo.deleteProfile(snap, id)), [apply]);
  const toggleRecord = useCallback(
    (profileId: string, itemId: CheckupItemId, year: number) =>
      apply((snap, now) => recordRepo.toggleRecord(snap, profileId, itemId, year, now)),
    [apply],
  );

  const dismissBanner = useCallback((month?: string): StoreResult => {
    const target = month ?? currentMonth(new Date());
    const result = recordRepo.dismissBanner(target);
    if (result.ok) setState((s) => ({ ...s, banner: { dismissedMonth: target } }));
    return result;
  }, []);

  const resetAll = useCallback((): StoreResult => {
    const result = recordRepo.resetAll();
    if (result.ok) {
      snapshot.current = { profiles: [], records: [] };
      setState({ ...INITIAL, status: "ready" });
    }
    return result;
  }, []);

  const value = useMemo<CheckupStore>(
    () => ({ ...state, addProfile, updateProfile, deleteProfile, toggleRecord, dismissBanner, resetAll }),
    [state, addProfile, updateProfile, deleteProfile, toggleRecord, dismissBanner, resetAll],
  );

  return <CheckupStoreContext.Provider value={value}>{children}</CheckupStoreContext.Provider>;
}
