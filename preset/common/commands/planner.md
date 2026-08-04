---
name: planner
description: planner 서브에이전트에게 계획 수립을 위임합니다. PM 워크플로우 없이 계획 단계만 실행할 때 사용합니다.
argument-hint: <task_id> <작업 주제>
---

**planner** 서브에이전트에게 계획 수립을 위임하세요. {{DELEGATE_HINT}}

입력: {{ARGS}}

## 전달할 내용

- `task_id` — 입력의 첫 토큰. **없으면 사용자에게 먼저 요청하고, 받기 전에는 위임하지 않습니다.** 임의로 정하지 마세요.
- `Phase` — `works/<task_id>/pending.md` 존재 여부로 판단합니다.
  - 없음 → `Phase 1 (Discovery)`: 미결정 사항만 분석해 `pending.md` 작성
  - 있음 → `Phase 2 (Planning)`: 사용자 결정사항 **원문**을 함께 전달해 `plan.md` / `decisions.md` / `followups.md` 작성
- 작업 주제 (자연어) 및 참고 문서 경로가 있으면 함께 전달합니다.

## 이후 처리

- 서브에이전트 응답을 요약해 사용자에게 보고합니다.
- Phase 1에서 미결정 항목이 있으면 회신 형식(`D1=A, D2=B`)을 안내합니다.
- **직접 계획을 작성하거나 코드를 수정하지 마세요.**
