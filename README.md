# spr-ai-native

AI 코딩 에이전트(Claude Code / Codex CLI / Cursor)로 개발할 때 쓰는 **개발 규칙 문서와 서브에이전트 프리셋**을 현재 프로젝트에 생성하는 CLI입니다.

생성되는 것은 `pm` → `planner` → `engineer` → `qa` 4개 역할로 구성된 개발 워크플로우입니다. 프로젝트 스택에 종속되지 않는 범용 프리셋이며, 스택·검증 명령·금지 사항은 생성된 프로젝트 지침 문서에 직접 작성해 채웁니다.

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

프로젝트 지침 문서(`CLAUDE.md` / `AGENTS.md` / `.cursor/rules/10-project.mdc`)의 `<...>` 플레이스홀더를 채우세요. 특히 **§4 검증 명령**은 `engineer`와 `qa`가 그대로 실행하는 계약입니다.

```markdown
| 목적 | 명령 | 필수 |
|---|---|---|
| 린트 | `pnpm lint` | 예 |
| 타입 체크 | `pnpm typecheck` | 예 |
| 단위 테스트 | `pnpm test:unit` | 예 |
```

비어 있는 행은 에이전트가 **N/A로 보고**하며, 대체 명령을 추측해 실행하지 않습니다. 검증이 조용히 생략되는 것보다 N/A로 드러나는 편이 안전하기 때문입니다.

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
         │                                 │ FAIL이면 engineer fix (최대 3회)
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

### 세션이 끊겨도 이어집니다

상태가 대화가 아니라 파일에 있으므로, 새 세션에서 `/pm <task_id>`만 다시 호출하면 재개 지점을 판단합니다.

| `works/<task_id>/`에 있는 파일 | 재개 지점 |
|---|---|
| 없음 | 착수 브리프 작성 |
| `pm-brief.md` | planner Phase 1 |
| `pm-brief.md` + `pending.md` | 결정 회신 대기 (회신과 함께 호출하면 Phase 2) |

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
  pm-report.md     pm       완료 보고 (판정: 완료 / 미완료(에스컬레이션))
```

`.gitignore`는 건드리지 않으므로 `works/`를 커밋할지는 직접 결정하세요.

### 역할별 권한

| 역할 | 코드 수정 | 산출물 | 비고 |
|---|---|---|---|
| pm | ✗ | pm-brief.md, pm-report.md | 메인 세션 역할 |
| planner | ✗ (`works/`만) | pending.md, plan.md, decisions.md, followups.md | |
| engineer | ✓ | engineer.md (회차별 append) | git 커밋/푸시 금지 |
| qa | ✗ | qa.md, followups.md | Cursor에서는 `readonly: true`로 강제 |

- **PM은 서브에이전트가 아니라 메인 세션의 역할**입니다. `/pm`으로 진입하면 그 세션이 PM이 되어 나머지 3개에게 위임합니다. 서브에이전트가 다시 서브에이전트를 호출하는 중첩 위임에 의존하지 않으므로 세 도구에서 동일하게 동작합니다. 다만 도구 권한으로 PM의 코드 수정을 차단할 수 없어 프롬프트 규율에만 의존합니다 — 중첩 위임 의존성을 없애기 위한 트레이드오프입니다.
- **task_id는 사용자에게 확인받습니다.** PM이 git 브랜치명에서 후보를 제안하지만 확정은 사용자가 합니다. 디렉터리명이 되므로 `/`나 공백이 들어가면 되묻습니다.
- QA가 3회 fix 후에도 FAIL이면 임의로 통과시키지 않고, `pm-report.md`에 `판정: 미완료(에스컬레이션)`으로 기록한 뒤 사용자에게 넘깁니다.

### PM 없이 단계만 실행

```
/planner TECG-582 <작업 주제>
/engineer TECG-582
/qa TECG-582
```

해당 서브에이전트만 호출하는 얇은 래퍼입니다. 브리프 게이트도, QA fix 루프도 없습니다 — QA가 FAIL이면 fix를 제안만 하고 재호출은 직접 하셔야 합니다.

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
