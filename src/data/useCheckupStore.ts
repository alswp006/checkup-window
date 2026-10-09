import { createContext, useContext } from "react";
import type { BannerState, CheckupItemId, CheckupRecord, Profile, StoreResult } from "@/lib/types";
import type { ProfileInput, ProfilePatch } from "@/data/profileRepo";

export interface CheckupStore {
  status: "loading" | "ready";
  profiles: Profile[];
  records: CheckupRecord[];
  banner: BannerState;
  recovered: boolean;
  addProfile: (input: ProfileInput) => StoreResult;
  updateProfile: (id: string, patch: ProfilePatch) => StoreResult;
  deleteProfile: (id: string) => StoreResult;
  toggleRecord: (profileId: string, itemId: CheckupItemId, year: number) => StoreResult;
  /** month는 'YYYY-MM'. 생략하면 이번 달. */
  dismissBanner: (month?: string) => StoreResult;
  resetAll: () => StoreResult;
}

export const CheckupStoreContext = createContext<CheckupStore | null>(null);

export function useCheckupStore(): CheckupStore {
  const store = useContext(CheckupStoreContext);
  if (!store) throw new Error("useCheckupStore must be used within CheckupStoreProvider");
  return store;
}
