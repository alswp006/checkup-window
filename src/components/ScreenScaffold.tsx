import type { ReactNode } from "react";
import { PageShell } from "./PageShell";

/**
 * 골든 화면 골격 — PageShell + (선택)헤더 슬롯 + 본문(좌우 16px 패딩) + (선택)하단 CTA 슬롯.
 *
 * Pre-built (재구현 금지): 새 페이지는 이 골격으로 시작하라.
 *   <ScreenScaffold
 *     top={<Top title={<Top.TitleParagraph>제목</Top.TitleParagraph>} />}
 *     bottom={<SubmitFooter label="다음" onClick={...} />}
 *   >
 *     ...본문...
 *   </ScreenScaffold>
 *
 * top을 주면 <Top/>이 자체 safe-area를 처리하므로 상단 패딩을 제거한다.
 */
export function ScreenScaffold({
  top,
  children,
  bottom,
  flush,
}: {
  /** 본문 좌우 패딩을 없앤다 — TDS 행·입력칸의 내장 24px가 Top 제목과 같은 줄에 서야 하는 폼용. TDS 밖 요소는 FormInset으로 감싼다. */
  flush?: boolean;
  top?: ReactNode;
  children: ReactNode;
  bottom?: ReactNode;
}) {
  return (
    <PageShell style={top ? { paddingTop: 0 } : undefined}>
      {top}
      <div style={{ padding: flush ? "16px 0 0" : "16px 16px 0" }}>{children}</div>
      {bottom}
    </PageShell>
  );
}

/** flush 본문 안에서 TDS 밖 요소(라벨·칩·캡션)를 TDS 내장 좌우 여백(24px)에 맞춘다. */
export function FormInset({ children }: { children: ReactNode }) {
  return <div style={{ padding: "0 24px" }}>{children}</div>;
}
