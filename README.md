# spr-ai-native

AI 코딩 에이전트(Claude Code / Codex CLI / Cursor)로 개발할 때 쓰는 **개발 규칙 문서와 서브에이전트 프리셋**을 현재 프로젝트에 생성하는 CLI입니다.

생성되는 것은 `pm` → `planner` → `engineer` → `qa` 4개 역할로 구성된 개발 워크플로우입니다. 프로젝트 스택에 종속되지 않는 범용 프리셋이며, 스택·검증 항목·금지 사항은 생성된 프로젝트 지침 문서에 채웁니다.

## 사용법

설치 없이 실행하는 것을 권장합니다.

```bash
npx spr-ai-native@latest claude    # Claude Code용
npx spr-ai-native@latest codex     # Codex CLI용
npx spr-ai-native@latest cursor    # Cursor용
```

전역 설치도 가능합니다.

```bash
npm install -g spr-ai-native
spr-ai-native claude
```

**한 번에 한 대상만 생성합니다.** 여러 도구를 함께 쓰면 대상별로 각각 실행하세요.

### 옵션

| 옵션 | 설명 |
|---|---|
| `--global` | 공통 행동 지침을 전역 파일에도 설치합니다 (Cursor는 미지원, 아래 참고) |
| `--force` | 기존 파일을 덮어씁니다. 기본 동작은 건너뛰기입니다 |
| `--dry-run` | 파일을 만들지 않고 생성될 경로만 출력합니다 |
| `-h, --help` | 사용법 |
| `-v, --version` | 버전 |

**기존 파일은 덮어쓰지 않습니다.** 이미 `CLAUDE.md`나 `AGENTS.md`가 있으면 건너뛰고, 건너뛴 파일 목록과 함께 `--force` 안내를 출력합니다. 먼저 `--dry-run`으로 확인한 뒤 `--force`를 쓰는 것을 권장합니다.

## 실행 환경

| 항목 | 요구사항 |
|---|---|
| Node.js | **18 이상** (CLI 실행에만 필요. 프로젝트 언어와 무관합니다) |
| 의존성 | 없음 (외부 패키지를 쓰지 않습니다) |
| OS | macOS / Linux / Windows |

생성물을 실제로 활용하려면 각 도구가 **서브에이전트를 지원**해야 합니다.

| 도구 | 요구사항 | 확인 방법 |
|---|---|---|
| Claude Code | `.claude/agents/`, `.claude/commands/` 지원 버전 | `claude --version` |
| Codex CLI | 멀티 에이전트(서브에이전트) + skills 지원 버전 | `codex --version`, `~/.codex/config.toml`의 `[agents]` 확인 |
| Cursor | **2.4 이상** (서브에이전트 도입 버전) | Cursor > About |

서브에이전트를 쓸 수 없는 환경이면 `pm` 없이 `/planner` → `/engineer` → `/qa` 커맨드를 순서대로 직접 실행하는 방식으로도 사용할 수 있습니다.

## 생성되는 파일

### `claude`

```
CLAUDE.md                      프로젝트 지침 (템플릿 — 직접 채워야 함)
.claude/agents/planner.md      서브에이전트
.claude/agents/engineer.md
.claude/agents/qa.md
.claude/commands/pm.md         워크플로우 진입점 (/pm)
.claude/commands/planner.md    단계별 진입점 (/planner, /engineer, /qa)
.claude/commands/engineer.md
.claude/commands/qa.md
~/.claude/CLAUDE.md            --global 지정 시, 공통 행동 지침
```

### `codex`

```
AGENTS.md                      프로젝트 지침 (템플릿)
.codex/agents/planner.toml     서브에이전트 (TOML)
.codex/agents/engineer.toml
.codex/agents/qa.toml
.codex/skills/pm/SKILL.md      워크플로우 진입점 ($pm)
.codex/skills/planner/SKILL.md
.codex/skills/engineer/SKILL.md
.codex/skills/qa/SKILL.md
~/.codex/AGENTS.md             --global 지정 시, 공통 행동 지침
```

`.codex/config.toml`은 **수정하지 않습니다.** 멀티 에이전트가 비활성화되어 있으면 `[agents] enabled = true`를 직접 확인하세요.

### `cursor`

```
.cursor/rules/00-base.mdc      공통 행동 지침 (alwaysApply: true)
.cursor/rules/10-project.mdc   프로젝트 지침 (템플릿)
.cursor/agents/planner.md      서브에이전트
.cursor/agents/engineer.md
.cursor/agents/qa.md           (readonly: true — 코드 수정 불가)
.cursor/commands/pm.md         워크플로우 진입점 (/pm)
.cursor/commands/planner.md
.cursor/commands/engineer.md
.cursor/commands/qa.md
```

Cursor는 전역 규칙을 파일로 두지 않고 Settings > Rules > User Rules에 저장합니다. 따라서 `cursor` 대상에서 `--global`은 무시되며, 전역으로 쓰려면 `.cursor/rules/00-base.mdc`의 frontmatter 아래 본문을 User Rules에 직접 붙여넣으세요.

## 생성 직후 해야 할 일

프로젝트 지침 문서(`CLAUDE.md` / `AGENTS.md` / `.cursor/rules/10-project.mdc`)의 `<...>` 플레이스홀더를 채우세요.

**§4 검증 항목의 명령 칸은 비워둬도 됩니다.**

```markdown
| 항목 | 실행 | 명령 |
|---|---|---|
| 린트 | 필수 | |
| 타입 체크 | 필수 | |
| 단위 테스트 | 필수 | |
| 통합 테스트 | 선택 | |
| 포맷 검사 | 안 함 | |
```

사람이 정하는 것은 **`실행`(필수 / 선택 / 안 함)** 뿐입니다. "이 프로젝트가 무엇을 검증해야 하는가"는 사람의 판단이고, "그 명령이 무엇인가"는 프로젝트 설정에 이미 적혀 있는 사실이기 때문입니다.

명령 칸이 비어 있으면 `engineer`가 매니페스트·CI 설정·도구 설정에서 **근거를 찾아** 실행하고, 찾은 명령을 §4 표에 적어 넣습니다. 다음 회차부터는 다시 찾지 않습니다. `qa`는 표를 고치지 않고 찾은 명령을 `qa.md`에 기록만 합니다.

**근거를 못 찾으면 실행하지 않고 N/A로 보고합니다.** "아마 이 명령일 것"은 발견이 아니라 추측이며, 검증이 조용히 생략되는 것보다 N/A로 드러나는 편이 안전하기 때문입니다. 감시(watch) 모드로 도는 명령과 코드를 자동 수정하는 옵션이 붙은 명령도 같은 이유로 실행하지 않습니다.

## 워크플로우

```
[사용자] 논의하거나 스펙 파일 준비
   │
[사용자] /pm TECG-582 위 논의대로 진행
   │
[PM]     task_id 확인 → works/TECG-582/pm-brief.md 작성
   ⏸ 멈춤 ──────────────────────────────────── 게이트 1 (착수 브리프 확인)
   │
[사용자] 진행                    (고칠 게 있으면 pm-brief.md를 직접 편집한 뒤 "진행")
   │
[PM]     planner Phase 1 → works/TECG-582/pending.md
   ⏸ 멈춤 ──────────────────────────────────── 게이트 2 (미결정 0개면 스킵)
   │
[사용자] D1=A, D2=B
   │
[PM]     planner Phase 2 → engineer → qa ─┐
         │                                 │ FAIL이면 engineer fix (기본 최대 3회)
         └── qa PASS ──────────────────────┘
         works/TECG-582/pm-report.md 작성 + 채팅 보고
   │
[사용자] 코드 리뷰 → 직접 커밋
```

### 사용자가 실제로 입력하는 것: 3~4번

| 순서 | 입력 | 비고 |
|---|---|---|
| 1 | `/pm TECG-582 <지시>` | 논의 후면 "위 논의대로", 파일이면 "docs/spec.md 기준으로" |
| 2 | `진행` | 착수 브리프 확인 후 |
| 3 | `D1=A, D2=B` | 미결정 사항이 없으면 이 단계 없음 |
| 4 | (커밋) | PM은 커밋하지 않습니다 |

3번 이후 **engineer → qa → fix 루프 → 완료 보고까지는 개입 없이 자동**입니다.

### 착수 브리프 게이트

`/pm`은 곧바로 위임하지 않고 먼저 `works/<task_id>/pm-brief.md`를 씁니다. **PM은 이전 대화를 보지만 서브에이전트는 보지 못하므로, 이 문서가 planner에게 전달되는 유일한 입력입니다.** 논의 내용이 압축되는 유일한 병목을 파일로 만들어 사용자가 검토할 수 있게 한 것입니다.

brief에 들어가는 것: 목표 / 배경 / 범위(**포함 · 명시적 제외**) / 참고 자료 / 확인 필요 항목.
brief에 들어가지 않는 것: 구현 방법, 파일 목록, 작업 단위, 테스트 전략 — planner의 몫입니다.

채팅으로 정정하는 대신 **`pm-brief.md`를 직접 편집**하는 것을 권합니다. planner는 사용자가 확인한 그 파일을 그대로 읽습니다. `범위: 제외` 항목은 planner가 계획에 넣지 않고 `followups.md`로만 넘깁니다.

### README는 두 역할이 나눠 씁니다

`works/` 밖에서 에이전트가 손대는 파일은 `README.md` 하나뿐입니다.

| 구간 | 작성자 | 내용 |
|---|---|---|
| 실행 방법 | engineer | 설치 / 실행 / 테스트 명령을 **실제로 실행해본 그대로**. 환경변수는 이름과 예시값만 |
| 개요 · 범위 · 알려진 한계 | pm | `pm-brief.md`의 `범위: 제외`와 약점 표에서 사용자에게 영향이 가는 것만 |

PM은 engineer가 쓴 실행 방법 섹션을 수정하지 않습니다. 실제로 실행해보고 쓴 쪽이 engineer이기 때문입니다.

**사용자에게 보이는 변화가 있을 때만 갱신합니다.** 내부 리팩터링이나 테스트 추가만으로는 README를 건드리지 않으며, 기존 README에 사람이 써 둔 내용은 지우지 않고 해당 섹션만 갱신합니다.

### 알려진 약점은 산출물에 남습니다

완료 보고(`pm-report.md`)는 **판정과 함께 알려진 약점을 반드시 적습니다.** 판정이 `완료`여도 생략하지 않습니다.

재료는 구현한 쪽에서 나옵니다. engineer는 회차 보고에 자기가 작성한 코드 중 **재현 조건을 적을 수 있는** 취약 지점을 남기고, QA는 미커버리지(N/A)를 남깁니다. PM은 이 둘과 `범위: 제외`·`followups.md`에서 파급이 큰 순으로 3개 내외를 추려 `지점 / 왜 위험한가 / 다음에 검증할 것`으로 정리합니다.

**PM은 코드를 읽지 않으므로 이 표는 추측이 아니라 인용입니다.** 재현 조건을 못 적는 것은 약점이 아니라 추측이라고 보고 걸러냅니다. 통과 보고서만 남기면 다음 사람이 같은 지뢰를 다시 밟기 때문입니다.

### 세션이 끊겨도 이어집니다

상태가 대화가 아니라 파일에 있으므로, 새 세션에서 `/pm <task_id>`만 다시 호출하면 재개 지점을 판단합니다.

| `works/<task_id>/`에 있는 파일 | 재개 지점 |
|---|---|
| 없음 | 착수 브리프 작성 |
| `pm-brief.md` | planner Phase 1 |
| `pm-brief.md` + `pending.md` | 결정 회신 대기 (회신과 함께 호출하면 Phase 2) |
| `plan.md`가 있으면 (위 조건보다 우선) | engineer부터. planner를 다시 부르지 않습니다 |

### 산출물

```
works/<task_id>/
  pm-brief.md      pm       착수 브리프 (사용자 확인 대상)
  pending.md       planner  미결정 사항 (있을 때만)
  plan.md          planner  구현 계획
  decisions.md     planner  결정 로그
  engineer.md      engineer 회차별 구현 보고
  qa.md            qa       검증 결과
  followups.md     3개 역할 append
  pm-report.md     pm       완료 보고 (판정 · 알려진 약점)
```

`.gitignore`는 건드리지 않으므로 `works/`를 커밋할지는 직접 결정하세요.

### 역할별 권한

| 역할 | 코드 수정 | 산출물 | 비고 |
|---|---|---|---|
| pm | ✗ | pm-brief.md, pm-report.md, README(개요·범위·한계) | 메인 세션 역할 |
| planner | ✗ (`works/`만) | pending.md, plan.md, decisions.md, followups.md | |
| engineer | ✓ | engineer.md (회차별 append), README(실행 방법) | git 커밋/푸시 금지 |
| qa | ✗ | qa.md, followups.md | Cursor에서는 `readonly: true`로 강제 |

- **PM은 서브에이전트가 아니라 메인 세션의 역할**입니다. `/pm`으로 진입하면 그 세션이 PM이 되어 나머지 3개에게 위임합니다. 서브에이전트가 다시 서브에이전트를 호출하는 중첩 위임에 의존하지 않으므로 세 도구에서 동일하게 동작합니다. 다만 도구 권한으로 PM의 코드 수정을 차단할 수 없어 프롬프트 규율에만 의존합니다 — 중첩 위임 의존성을 없애기 위한 트레이드오프입니다.
- **task_id는 사용자에게 확인받습니다.** PM이 git 브랜치명에서 후보를 제안하지만 확정은 사용자가 합니다. 디렉터리명이 되므로 `/`나 공백이 들어가면 되묻습니다.
- QA가 재시도 상한을 소진하고도 FAIL이면 임의로 통과시키지 않고, `pm-report.md`에 `판정: 미완료(에스컬레이션)`으로 기록한 뒤 사용자에게 넘깁니다.

### 어느 진입점을 쓸까

`/pm`은 게이트 2개와 서브에이전트 호출 4회 이상을 포함합니다. **모든 작업에 쓰라고 만든 것이 아닙니다.**

| 작업 | 진입점 | 이유 |
|---|---|---|
| 스택·범위·설계에 갈림길이 있다 | `/pm` | 미결정 사항을 사용자 결정으로 확정하는 것이 이 워크플로우의 값어치입니다 |
| 계획은 이미 섰고 구현만 남았다 | `/engineer` → `/qa` | brief·pending·plan을 만들 이유가 없습니다 |
| 계획만 받아보고 싶다 | `/planner` | 구현은 나중에 판단합니다 |
| 방금 고친 것만 검증하고 싶다 | `/qa` | |
| 오타 수정, 한 줄 변경 | **아무것도 쓰지 않음** | 워크플로우 비용이 작업보다 큽니다 |

```
/planner TECG-582 <작업 주제>
/engineer TECG-582
/qa TECG-582
```

개별 커맨드는 해당 서브에이전트만 호출하는 얇은 래퍼입니다. 브리프 게이트도, QA fix 루프도 없습니다 — QA가 FAIL이면 fix를 제안만 하고 재호출은 직접 하셔야 합니다. 산출물 파일 규약은 `/pm`과 동일하므로, 개별 커맨드로 시작했다가 도중에 `/pm`으로 넘어가도 이어집니다.

### 작업 예산으로 무게 조절

프로젝트 지침 문서 **§5의 작업 예산** 표로 `/pm`의 왕복 횟수를 조절합니다. 기본값은 아래와 같고, 그대로 두면 지금까지의 동작과 같습니다.

| 항목 | 기본값 | 조절했을 때 |
|---|---|---|
| QA fix 재시도 횟수 | 3 | 줄이면 실패가 빨리 사용자에게 올라옵니다. `0`은 fix 없이 첫 QA 결과로 종료 |
| 계획 단계 | 분리 | `통합`은 planner 호출을 2회 → 1회로 줄입니다 |

`계획 단계 = 통합`이면 planner가 `pending.md`와 **권장안을 채택했다고 가정한 `plan.md`** 를 한 번에 씁니다. 사용자가 `진행`으로 답하면 planner를 다시 부르지 않고 곧바로 engineer로 넘어갑니다.

대신 사용자가 권장안을 뒤집으면 planner를 Phase 2로 다시 불러야 하므로 그만큼 계획 작성이 헛일이 됩니다. **권장안 채택률이 높은 작업에서만 이득**입니다. 그래서 기본값은 `분리`입니다.

## 모델 변경

기본값은 **부모 세션 모델 상속**입니다. 특정 단계만 다른 모델로 돌리고 싶으면 생성된 파일을 직접 수정하세요.

| 도구 | 파일 | 수정 방법 |
|---|---|---|
| Claude Code | `.claude/agents/<role>.md` | `model: inherit` → `opus` / `sonnet` / `haiku` |
| Cursor | `.cursor/agents/<role>.md` | `model: inherit` → 모델 ID |
| Codex CLI | `.codex/agents/<role>.toml` | `model = "..."` 줄 추가 (필요 시 `model_reasoning_effort` 함께) |

각 파일에 안내 주석이 들어 있습니다. 예를 들어 `qa`는 저렴한 모델로, `planner`는 추론이 강한 모델로 두는 구성이 일반적입니다.

## 커스터마이징

생성된 파일은 그대로 프로젝트에 커밋해 팀과 공유하는 것을 전제로 합니다. 역할 정의를 프로젝트에 맞게 수정해도 되고, 이 저장소의 `preset/common/`을 포크해 사내 표준 프리셋으로 만들어도 됩니다.

```
preset/common/
  base-rules.md          공통 행동 지침
  project-doc.md         프로젝트 지침 템플릿
  roles/{planner,engineer,qa}.md   서브에이전트 정의 (도구 중립)
  commands/{pm,planner,engineer,qa}.md   진입점 정의 (도구 중립)
```

역할 본문은 한 번만 작성하고, 도구별 메타데이터(`tools`, `model`, `readonly`, TOML 변환)는 `src/targets/*.js`가 처리합니다. `{{PROJECT_DOC}}` 같은 플레이스홀더는 대상별로 치환됩니다.

## 개발

```bash
node --test        # 테스트
node bin/cli.js claude --dry-run
```

## 라이선스

MIT
