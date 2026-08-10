---
name: engineer
description: engineer 서브에이전트에게 구현 또는 QA fix를 위임합니다. PM 워크플로우 없이 구현 단계만 실행할 때 사용합니다.
argument-hint: <task_id> [fix]
---

**engineer** 서브에이전트에게 구현을 위임하세요. {{DELEGATE_HINT}}

입력: {{ARGS}}

## 전달할 내용

- `task_id` — 입력의 첫 토큰. **없으면 사용자에게 먼저 요청합니다.** 임의로 정하지 마세요.
- 모드 판단:
  - **신규 구현** — `works/<task_id>/plan.md` 경로와 `decisions.md` 경로를 전달합니다. `plan.md`가 없으면 위임하지 말고 planner를 먼저 실행하라고 사용자에게 안내합니다.
  - **QA Fix** — 입력에 `fix`가 있거나 `works/<task_id>/qa.md`가 FAIL/PARTIAL이면, `qa.md` 경로와 회차(`<N>/<최대>`)를 전달합니다. 최대 횟수는 프로젝트 지침 §5 작업 예산의 **QA fix 재시도 횟수**(기본 3)입니다. 회차는 `engineer.md`의 기존 회차 섹션 수를 보고 계산합니다.
- 다음 지시를 함께 전달합니다: 구현 보고를 `works/<task_id>/engineer.md`에 회차별 append, **git 커밋/푸시 금지**.

## 이후 처리

- 서브에이전트의 자체 검증 결과(검증 명령별 PASS/FAIL/N/A)를 그대로 사용자에게 전달합니다. **실행되지 않은 검증을 통과로 적지 마세요.**
- **직접 코드를 수정하지 마세요.**
