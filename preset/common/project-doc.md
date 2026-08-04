<!--
  이 문서는 spr-ai-native가 생성한 템플릿입니다.
  각 섹션의 <> 플레이스홀더를 프로젝트 실제 값으로 채우세요.
  §4 "검증 명령"은 engineer / qa 서브에이전트가 그대로 실행하는 계약입니다. 반드시 채우세요.
-->

# 프로젝트 개발 지침

## 1. 프로젝트 개요

<이 프로젝트가 무엇인지 2~3줄로. 무엇을 해결하는지, 누가 쓰는지.>

## 2. 기술 스택

| 항목 | 값 |
|---|---|
| 언어 / 런타임 | <예: TypeScript 5.x / Node 20> |
| 주요 프레임워크 | <예: NestJS 10> |
| 패키지 매니저 | <예: pnpm> |
| DB / 마이그레이션 | <예: PostgreSQL 16 / Prisma Migrate — 없으면 없음> |
| 테스트 프레임워크 | <예: Vitest> |

## 3. 디렉터리 구조

에이전트가 "새 코드를 어디에 둘지" 판단하는 근거입니다.

```
<예>
src/           애플리케이션 코드
  modules/     기능 모듈 (모듈당 controller/service/repository)
  shared/      공용 유틸
tests/
  unit/
  integration/
```

## 4. 검증 명령

engineer는 구현 후, qa는 검증 시 아래 표에서 **필수 = 예**인 명령을 모두 실행합니다.

| 목적 | 명령 | 필수 |
|---|---|---|
| 린트 | `<예: pnpm lint>` | 예 |
| 타입 체크 | `<예: pnpm typecheck>` | 예 |
| 단위 테스트 | `<예: pnpm test:unit>` | 예 |
| 통합 테스트 | `<예: pnpm test:integration>` | 아니오 |
| 포맷 검사 | `<예: pnpm format:check>` | 아니오 |
| 빌드 | `<예: pnpm build>` | 아니오 |

**규칙**
- 명령 칸이 비어 있거나 플레이스홀더 그대로인 행은 **N/A**로 처리하고, 보고서에 N/A로 명시합니다.
- 표에 없는 명령을 **추측해서 실행하지 마세요.** 필요하다고 판단되면 사용자에게 표 갱신을 요청합니다.
- 단일 테스트만 돌리는 방법: `<예: pnpm test:unit -- <파일경로>>`

## 5. 산출물 규약

모든 작업 산출물은 `works/<task_id>/` 아래에 기록합니다.

| 파일 | 작성자 | 갱신 방식 |
|---|---|---|
| `pending.md` | planner (Phase 1) | 덮어쓰기 |
| `plan.md` | planner (Phase 2) | 덮어쓰기 |
| `decisions.md` | planner (Phase 2) | 덮어쓰기 |
| `engineer.md` | engineer | 회차별 append |
| `qa.md` | qa | 회차마다 덮어쓰기 |
| `followups.md` | planner 최초 작성, engineer·qa append | append only |

- `works/`를 git에 커밋할지: <커밋함 / 커밋하지 않음(.gitignore에 추가)>

## 6. 아키텍처 규칙

<없으면 "특별한 제약 없음"으로 남겨두세요.>

- 레이어 경계 / 의존 방향: <예: controller → service → repository. 역방향 import 금지>
- 금지된 import: <예: modules/* 끼리 직접 import 금지, shared 경유>
- 검증 명령(있으면): <예: `rg "from '\.\./\.\./modules" src/` 결과가 비어 있어야 함>

## 7. 금지 사항

- **git 커밋/푸시 금지.** 커밋은 사용자가 직접 합니다.
- 테스트를 skip / xfail / 주석 처리해 우회하는 변경 금지. 정당한 사유는 `followups.md`에 기록하고 보고합니다.
- 계획(plan.md) 범위 외 임의 리팩터링 금지. 발견한 개선점은 `followups.md`에만 기록합니다.
- 사용자 컨펌 없이 새 의존성 추가 금지. 불가피하면 보고에 명시합니다.
- <프로젝트 고유 금지 사항>

## 8. 컨벤션

- 코드 주석 언어: <예: 영어>
- 네이밍: <예: 파일 kebab-case, 클래스 PascalCase>
- 커밋 메시지: <예: Conventional Commits, 영어>
