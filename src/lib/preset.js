import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PRESET_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'preset', 'common');

export const ROLES = ['planner', 'engineer', 'qa'];
export const COMMANDS = ['pm', 'planner', 'engineer', 'qa'];

export function readPreset(...segments) {
  return readFileSync(join(PRESET_DIR, ...segments), 'utf8');
}

/** 프리셋 문서를 frontmatter(meta)와 본문(body)으로 분리한다. */
export function parseDoc(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!match) return { meta: {}, body: raw.trim() };

  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const sep = line.indexOf(':');
    if (sep === -1) continue;
    meta[line.slice(0, sep).trim()] = line.slice(sep + 1).trim();
  }
  return { meta, body: raw.slice(match[0].length).trim() };
}

/** {{KEY}} 플레이스홀더를 치환한다. 정의되지 않은 키가 남아 있으면 즉시 실패한다. */
export function fill(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (all, key) => {
    if (!(key in vars)) throw new Error(`알 수 없는 플레이스홀더: ${all}`);
    return vars[key];
  });
}

export function loadRole(name, vars) {
  const { meta, body } = parseDoc(readPreset('roles', `${name}.md`));
  return { meta, body: fill(body, vars) };
}

export function loadCommand(name, vars) {
  const { meta, body } = parseDoc(readPreset('commands', `${name}.md`));
  return { meta, body: fill(body, vars) };
}

export function baseRules() {
  return readPreset('base-rules.md').trim();
}

/**
 * 프로젝트 지침 문서 본문.
 * withBaseRules=false면 §9를 전역 파일 안내로 대체한다.
 */
export function projectDoc({ withBaseRules, globalPath }) {
  const doc = readPreset('project-doc.md').trim();
  const section9 = withBaseRules
    ? baseRules()
    : `공통 행동 지침은 전역 파일 \`${globalPath}\`에 설치되어 있습니다.`;
  return `${doc}\n\n## 9. 공통 행동 지침\n\n${section9}\n`;
}
