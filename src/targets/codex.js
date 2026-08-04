import { join } from 'node:path';
import { COMMANDS, ROLES, baseRules, loadCommand, loadRole, projectDoc } from '../lib/preset.js';
import { frontmatter, quoted } from '../lib/write.js';

export const label = 'Codex CLI';
export const projectDocPath = 'AGENTS.md';
export const globalDocPath = '~/.codex/AGENTS.md';

const MODEL_COMMENT = `# model을 지정하지 않으면 부모 세션의 모델을 상속합니다.
# 고정하려면 model = "..." / model_reasoning_effort = "..." 를 추가하세요.`;

const DELEGATE_HOWTO = `Codex 멀티 에이전트 기능으로 서브에이전트를 spawn 합니다. \`.codex/agents/\`에 정의된 \`planner\` / \`engineer\` / \`qa\` 를 이름으로 지정해 호출하세요.

- 서브에이전트는 이 대화의 컨텍스트를 **보지 못합니다.** task_id, 파일 경로, 회차를 프롬프트에 반드시 포함하세요.
- 한 번에 하나씩 순서대로 spawn 합니다 (planner → engineer → qa). 각 단계가 앞 단계 산출물에 의존하므로 병렬 실행하지 마세요.
- 멀티 에이전트가 비활성화되어 있어 spawn이 불가능하면, 임의로 직접 구현하지 말고 사용자에게 알리고 중단하세요.`;

const vars = {
  PROJECT_DOC: projectDocPath,
  ARGS: '사용자가 이 스킬을 호출할 때 함께 입력한 내용',
  DELEGATE_HINT: '(멀티 에이전트 기능으로 해당 이름의 서브에이전트를 spawn 합니다.)',
  DELEGATE_HOWTO,
};

function tomlLiteral(body, role) {
  if (body.includes("'''")) {
    throw new Error(`${role} 본문에 ''' 가 있어 TOML 리터럴 문자열로 변환할 수 없습니다.`);
  }
  return `'''\n${body}\n'''`;
}

export function apply({ writer, cwd, home, useGlobal }) {
  const notes = [];

  writer.write(
    join(cwd, projectDocPath),
    projectDoc({ withBaseRules: !useGlobal, globalPath: globalDocPath })
  );

  for (const role of ROLES) {
    const { meta, body } = loadRole(role, vars);
    const toml = [
      MODEL_COMMENT,
      `name = ${quoted(meta.name)}`,
      `description = ${quoted(meta.description)}`,
      `developer_instructions = ${tomlLiteral(body, role)}`,
    ].join('\n');
    writer.write(join(cwd, '.codex', 'agents', `${role}.toml`), `${toml}\n`);
  }

  for (const command of COMMANDS) {
    const { meta, body } = loadCommand(command, vars);
    const head = frontmatter([
      ['name', meta.name],
      ['description', quoted(meta.description)],
    ]);
    writer.write(join(cwd, '.codex', 'skills', command, 'SKILL.md'), `${head}\n${body}\n`);
  }

  if (useGlobal) {
    const status = writer.write(
      join(home, '.codex', 'AGENTS.md'),
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

  notes.push('`$pm` 스킬로 워크플로우를 시작합니다. (예: `$pm PROJ-582 로그인 API 구현`)');
  notes.push(
    '`.codex/config.toml`은 수정하지 않았습니다. 멀티 에이전트가 꺼져 있으면 `[agents] enabled = true` 를 직접 확인하세요.'
  );
  return notes;
}
