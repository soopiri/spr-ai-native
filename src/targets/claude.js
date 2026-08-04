import { join } from 'node:path';
import { COMMANDS, ROLES, baseRules, loadCommand, loadRole, projectDoc } from '../lib/preset.js';
import { frontmatter, quoted } from '../lib/write.js';

export const label = 'Claude Code';
export const projectDocPath = 'CLAUDE.md';
export const globalDocPath = '~/.claude/CLAUDE.md';

const AGENT_TOOLS = {
  planner: 'Read, Write, Edit, Grep, Glob, Bash',
  engineer: 'Read, Write, Edit, Grep, Glob, Bash, TodoWrite',
  qa: 'Read, Grep, Glob, Bash, Write, Edit',
};

const MODEL_COMMENT =
  '# model: 기본값 inherit(부모 세션 모델 상속). opus / sonnet / haiku 등으로 변경할 수 있습니다.';

const DELEGATE_HOWTO = `\`Task\` 툴로 서브에이전트를 호출합니다. \`subagent_type\`에 \`planner\` / \`engineer\` / \`qa\` 중 하나를 지정하고 위임 프롬프트를 함께 전달합니다.

- 서브에이전트는 이 대화의 컨텍스트를 **보지 못합니다.** task_id, 파일 경로, 회차를 프롬프트에 반드시 포함하세요.
- 한 번에 하나씩 순서대로 호출합니다 (planner → engineer → qa). 각 단계가 앞 단계 산출물에 의존하므로 병렬 호출하지 마세요.`;

const vars = {
  PROJECT_DOC: projectDocPath,
  ARGS: '$ARGUMENTS',
  DELEGATE_HINT: '(`Task` 툴의 `subagent_type`으로 위 이름을 지정합니다.)',
  DELEGATE_HOWTO,
};

export function apply({ writer, cwd, home, useGlobal }) {
  const notes = [];

  writer.write(
    join(cwd, projectDocPath),
    projectDoc({ withBaseRules: !useGlobal, globalPath: globalDocPath })
  );

  for (const role of ROLES) {
    const { meta, body } = loadRole(role, vars);
    const head = frontmatter([
      ['name', meta.name],
      ['description', quoted(meta.description)],
      MODEL_COMMENT,
      ['model', 'inherit'],
      ['tools', quoted(AGENT_TOOLS[role])],
    ]);
    writer.write(join(cwd, '.claude', 'agents', `${role}.md`), `${head}\n${body}\n`);
  }

  for (const command of COMMANDS) {
    const { meta, body } = loadCommand(command, vars);
    const head = frontmatter([
      ['description', quoted(meta.description)],
      ['argument-hint', quoted(meta['argument-hint'])],
    ]);
    writer.write(join(cwd, '.claude', 'commands', `${command}.md`), `${head}\n${body}\n`);
  }

  if (useGlobal) {
    const status = writer.write(
      join(home, '.claude', 'CLAUDE.md'),
      `# 공통 행동 지침\n\n${baseRules()}\n`
    );
    if (status === 'skipped') {
      notes.push(
        `${globalDocPath}가 이미 있어 건너뛰었습니다. 공통 행동 지침이 전역에 없을 수 있으니 ${projectDocPath} §9를 확인하세요.`
      );
    }
  } else {
    notes.push(
      `공통 행동 지침을 전역(${globalDocPath})에도 설치하려면 \`--global\`을 붙여 다시 실행하세요.`
    );
  }

  notes.push('`/pm <task_id> <작업 지시>` 로 워크플로우를 시작합니다.');
  return notes;
}
