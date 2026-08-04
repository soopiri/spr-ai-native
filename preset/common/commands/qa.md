---
name: qa
description: qa 서브에이전트에게 검증을 위임합니다. PM 워크플로우 없이 검증 단계만 실행할 때 사용합니다.
argument-hint: <task_id>
---

**qa** 서브에이전트에게 검증을 위임하세요. {{DELEGATE_HINT}}

입력: {{ARGS}}

## 전달할 내용

- `task_id` — 입력의 첫 토큰. **없으면 사용자에게 먼저 요청합니다.** 임의로 정하지 마세요.
- 회차 — `works/<task_id>/engineer.md`의 회차 섹션 수를 기준으로 계산해 전달합니다.
- 다음 지시를 함께 전달합니다: `works/<task_id>/plan.md` §5 테스트 전략을 기준으로 검증하고 결과를 `works/<task_id>/qa.md`에 작성. **코드 수정 절대 금지.**

## 이후 처리

- 종합 판정(PASS / FAIL / PARTIAL)과 실패 항목을 그대로 사용자에게 보고합니다. 축소 보고 금지.
- FAIL/PARTIAL이면 다음 액션으로 engineer fix를 제안합니다 (자동으로 실행하지는 않습니다).
- **직접 코드나 테스트를 수정하지 마세요.**
