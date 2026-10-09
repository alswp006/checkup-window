/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

/** localStorage 항목 id 생성. 0007 addProfile 등에서 사용. (구현: 패킷 0006) */
export type newIdFn = () => string;

/** 키 3개 삭제. removeItem 예외는 throw하지 않고 { ok: false }로 반환. 실패 시 로그를 남기지 않는다. 0009 액션 및 0017 초기화에서 사용. (구현: 패킷 0008) */
export type resetAllFn = () => { ok: boolean };

/** isEvaluable이 false인 가족 이름으로 만든 안내 문구. 반환은 문자열로 가정. 0016·0018에서 사용. (구현: 패킷 0004) */
export type invalidFamilyLineFn = (name: string) => string;
