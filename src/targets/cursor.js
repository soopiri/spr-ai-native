import { join } from 'node:path';
import { COMMANDS, ROLES, baseRules, loadCommand, loadRole, readPreset } from '../lib/preset.js';
import { frontmatter, quoted } from '../lib/write.js';

export const label = 'Cursor';
export const projectDocPath = '.cursor/rules/10-project.mdc';
export const globalDocPath = null; // Cursor 전역 규칙은 파일이 아니라 Settings > Rules > User Rules

// qa는 코드 수정이 금지되므로 readonly. planner/engineer는 works/ 및 소스에 써야 한다.
const READONLY = { planner: false, engineer: false, qa: true };

const MODEL_COMMENT =
  '# model: 기본값 inherit(부모 세션 모델 상속). 특정 모델 ID로 변경할 수 있습니다.';

const DELEGATE_HOWTO = `\`.cursor/agents/\`에 정의된 \`planner\` / \`engineer\` / \`qa\` 서브에이전트에게 위임합니다. 이름을 명시해 호출하세요.

- 서브에이전트는 이 대화의 컨텍스트를 **보지 못합니다.** task_id, 파일 경로, 회차를 프롬프트에 반드시 포함하세요.
- 한 번에 하나씩 순서대로 위임합니다 (planner → engineer → qa). 각 단계가 앞 단계 산출물에 의존하므로 병렬 실행하지 마세요.`;

const vars = {
  PROJECT_DOC: projectDocPath,
  ARGS: '사용자가 이 커맨드와 함께 입력한 내용',
  DELEGATE_HINT: '(서브에이전트 이름을 명시해 위임합니다.)',
  DELEGATE_HOWTO,
};

export function apply({ writer, cwd, useGlobal }) {
  const notes = [];

  writer.write(
    join(cwd, '.cursor', 'rules', '00-base.mdc'),
    `${frontmatter([
      ['description', quoted('공통 개발 행동 지침')],
      ['alwaysApply', 'true'],
    ])}\n# 공통 행동 지침\n\n${baseRules()}\n`
  );

  writer.write(
    join(cwd, '.cursor', 'rules', '10-project.mdc'),
    `${frontmatter([
      ['description', quoted('프로젝트 개요 · 기술 스택 · 검증 명령 · 산출물 규약')],
      ['alwaysApply', 'true'],
    ])}\n${readPreset('project-doc.md').trim()}\n`
  );

  for (const role of ROLES) {
    const { meta, body } = loadRole(role, vars);
    const head = frontmatter([
      ['name', meta.name],
      ['description', quoted(meta.description)],
      MODEL_COMMENT,
      ['model', 'inherit'],
      ['readonly', String(READONLY[role])],
    ]);
    writer.write(join(cwd, '.cursor', 'agents', `${role}.md`), `${head}\n${body}\n`);
  }

  for (const command of COMMANDS) {
    const { body } = loadCommand(command, vars);
    writer.write(join(cwd, '.cursor', 'commands', `${command}.md`), `${body}\n`);
  }

  if (useGlobal) {
    notes.push(
      'Cursor는 전역 규칙을 파일로 두지 않습니다(Settings > Rules > User Rules). `--global`은 무시했습니다.'
    );
    notes.push(
      '전역으로 쓰려면 `.cursor/rules/00-base.mdc`의 frontmatter 아래 본문을 User Rules에 붙여넣으세요.'
    );
  }

  notes.push('`/pm <task_id> <작업 지시>` 로 워크플로우를 시작합니다.');
  return notes;
}
