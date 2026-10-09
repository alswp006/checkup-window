/**
 * 타입 + RouteState 계약 테스트.
 *
 * 이 패킷의 산출물은 런타임 코드가 0줄인 타입 정의(src/lib/types.ts)다. 그래서 여기서 무는 것은
 * 값(동작)이 아니라 **타입 모양**이다 — 필드 이름·유니온 멤버·라우트 state 유니온이 SPEC과 1:1인가.
 *
 * - expectTypeOf 단언은 tsc가 검사한다(런타임에선 no-op). 빨간 것은 tsc 단계에서 드러난다.
 * - 런타임 expect는 타입을 만족하는 객체 리터럴을 만들어 모양을 한 번 더 확인하고,
 *   types.ts의 export 형태(값 export 0개)는 소스 텍스트로 직접 확인한다.
 * UI가 없으므로 TDS·react-router 목은 걸지 않는다.
 */
import { describe, it, expect, expectTypeOf } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
  Sex,
  InsuranceType,
  CheckupItemId,
  CheckupRule,
  Profile,
  CheckupRecord,
  BannerState,
  ItemStatus,
  ProfileResult,
  PlanYear,
  StoreResult,
  HomeLocationState,
  ProfileFormLocationState,
} from "@/lib/types";

const typesSource = readFileSync(resolve(process.cwd(), "src/lib/types.ts"), "utf8");

describe("TypeScript 타입 + RouteState 계약 정의", () => {
  it("AC-1[P0]: types.ts는 type/interface export만 가진다 (값 export 0개)", () => {
    // 값 export(const·let·var·function·class·enum)가 하나라도 있으면 빨갛다
    const valueExports = typesSource.match(/^export\s+(const|let|var|function|class|enum|default)\b/gm) ?? [];
    expect(valueExports).toEqual([]);

    // 모든 export 문은 type 또는 interface여야 한다 (빈 `export {};` 같은 자리표시자도 실패)
    const exportLines = typesSource.split("\n").filter((line) => /^export\s/.test(line));
    expect(exportLines.length).toBeGreaterThan(0);
    expect(exportLines.every((line) => /^export (type|interface) /.test(line))).toBe(true);
  });

  it("AC-2[P0]: Profile 필드는 SPEC과 1:1 — id·name·role·birthYear·sex·insuranceType·createdAt·updatedAt", () => {
    expectTypeOf<keyof Profile>().toEqualTypeOf<
      "id" | "name" | "role" | "birthYear" | "sex" | "insuranceType" | "createdAt" | "updatedAt"
    >();
    expectTypeOf<Profile["role"]>().toEqualTypeOf<"self" | "family">();
    expectTypeOf<Profile["birthYear"]>().toEqualTypeOf<number>();

    const profile: Profile = {
      id: "p-1",
      name: "나",
      role: "self",
      birthYear: 1988,
      sex: "female",
      insuranceType: "employee_office",
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    };
    expect(Object.keys(profile).sort()).toEqual(
      ["birthYear", "createdAt", "id", "insuranceType", "name", "role", "sex", "updatedAt"],
    );
    expect(profile.role).toBe("self");

    // 에러 케이스: 역할은 'self' | 'family' 둘뿐이다 (tsc 단계에서 거부돼야 한다)
    // @ts-expect-error — 'other'는 Profile 역할이 아니다
    const badRole: Profile["role"] = "other";
    expect(badRole).toBe("other");
  });

  it("AC-3[P0]: StoreResult·HomeLocationState·ProfileFormLocationState 유니온이 SPEC과 일치한다", () => {
    expectTypeOf<StoreResult>().toEqualTypeOf<
      | { ok: true }
      | { ok: false; error: "STORAGE_FULL" | "FAMILY_LIMIT" | "DUPLICATE_NAME" | "SELF_EXISTS" }
    >();
    expectTypeOf<HomeLocationState>().toEqualTypeOf<{ toast: "saved" | "deleted" } | null>();
    expectTypeOf<ProfileFormLocationState>().toEqualTypeOf<{ mode: "self" | "family" } | null>();

    const failed: StoreResult = { ok: false, error: "FAMILY_LIMIT" };
    expect(failed.ok).toBe(false);
    expect(failed).toEqual({ ok: false, error: "FAMILY_LIMIT" });

    const toast: HomeLocationState = { toast: "deleted" };
    expect(toast).toEqual({ toast: "deleted" });
  });

  it("AC-4[P0]: CheckupItemId는 정확히 7개 멤버이고 ItemStatus·ProfileResult 필드명이 SPEC과 일치한다", () => {
    const ALL_ITEM_IDS = ["general", "stomach", "colorectal", "breast", "cervical", "liver", "lung"] as const;
    expectTypeOf<CheckupItemId>().toEqualTypeOf<(typeof ALL_ITEM_IDS)[number]>();
    expect(ALL_ITEM_IDS).toHaveLength(7);
    expect(ALL_ITEM_IDS).toContain("lung");

    expectTypeOf<keyof ItemStatus>().toEqualTypeOf<
      "itemId" | "label" | "eligibleThisYear" | "conditional" | "received" | "nextYear" | "reason"
    >();
    expectTypeOf<ItemStatus["nextYear"]>().toEqualTypeOf<number | null>();

    expectTypeOf<keyof ProfileResult>().toEqualTypeOf<
      | "profileId"
      | "year"
      | "age"
      | "items"
      | "eligibleCount"
      | "receivedCount"
      | "daysLeft"
      | "nextCheckupYear"
    >();
    expectTypeOf<ProfileResult["nextCheckupYear"]>().toEqualTypeOf<number | null>();

    const status: ItemStatus = {
      itemId: "stomach",
      label: "위암 검진",
      eligibleThisYear: true,
      conditional: false,
      received: false,
      nextYear: 2026,
      reason: "2026년 대상(짝수년 출생)",
    };
    expect(status.itemId).toBe("stomach");
    expect(status.nextYear).toBe(2026);
  });

  it("AC-5[P1]: PlanYear = { year: number; items: ItemStatus[] }", () => {
    expectTypeOf<PlanYear>().toEqualTypeOf<{ year: number; items: ItemStatus[] }>();

    const plan: PlanYear = { year: 2027, items: [] };
    expect(plan.year).toBe(2027);
    expect(plan.items).toEqual([]);
  });

  it("Storage shapes[P1]: Sex·InsuranceType·CheckupRule·CheckupRecord·BannerState 필드가 SPEC과 일치한다", () => {
    expectTypeOf<Sex>().toEqualTypeOf<"male" | "female">();
    expectTypeOf<InsuranceType>().toEqualTypeOf<
      "employee_office" | "employee_nonoffice" | "regional_head" | "dependent" | "medical_aid"
    >();

    expectTypeOf<CheckupRule["cycle"]>().toEqualTypeOf<"annual" | "biennial">();
    expectTypeOf<CheckupRule["sex"]>().toEqualTypeOf<Sex | null>();
    expectTypeOf<keyof CheckupRule>().toEqualTypeOf<
      "id" | "label" | "cycle" | "minAge" | "maxAge" | "sex" | "conditional" | "conditionText" | "source"
    >();

    expectTypeOf<keyof CheckupRecord>().toEqualTypeOf<"profileId" | "itemId" | "year" | "receivedAt">();
    expectTypeOf<BannerState>().toEqualTypeOf<{ dismissedMonth: string | null }>();

    const record: CheckupRecord = {
      profileId: "p-1",
      itemId: "general",
      year: 2026,
      receivedAt: "2026-05-02T09:00:00.000Z",
    };
    expect(record).toEqual({
      profileId: "p-1",
      itemId: "general",
      year: 2026,
      receivedAt: "2026-05-02T09:00:00.000Z",
    });

    const banner: BannerState = { dismissedMonth: "2026-10" };
    expect(banner.dismissedMonth).toBe("2026-10");
  });
});
