#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TARGET_NAMES, run, suggestTarget } from '../src/index.js';

const PKG = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8')
);

const USAGE = `사용법: npx spr-ai-native <${TARGET_NAMES.join('|')}> [옵션]

AI 코딩 에이전트용 개발 규칙과 서브에이전트 프리셋을 현재 디렉터리에 생성합니다.

대상
  claude   CLAUDE.md, .claude/agents/, .claude/commands/
  codex    AGENTS.md, .codex/agents/(TOML), .codex/skills/
  cursor   .cursor/rules/, .cursor/agents/, .cursor/commands/

옵션
  --global    공통 행동 지침을 전역 파일에도 설치 (cursor는 미지원)
  --force     기존 파일을 덮어씁니다 (기본 동작: 건너뜀)
  --dry-run   파일을 만들지 않고 생성될 경로만 출력합니다
  -h, --help
  -v, --version

한 번에 한 대상만 생성합니다. 여러 도구를 쓰려면 대상별로 각각 실행하세요.`;

const STATUS_LABEL = {
  created: '생성  ',
  overwritten: '덮어씀',
  skipped: '건너뜀',
  'dry-run': '예정  ',
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

function displayPath(path, cwd, home) {
  const rel = relative(cwd, path);
  if (rel && !rel.startsWith('..')) return rel;
  return path.startsWith(home) ? `~${path.slice(home.length)}` : path;
}

function main(argv) {
  const options = { useGlobal: false, force: false, dryRun: false };
  const positional = [];

  for (const arg of argv) {
    switch (arg) {
      case '-h':
      case '--help':
        console.log(USAGE);
        return;
      case '-v':
      case '--version':
        console.log(PKG.version);
        return;
      case '--global':
        options.useGlobal = true;
        break;
      case '--force':
        options.force = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      default:
        if (arg.startsWith('-')) fail(`알 수 없는 옵션: ${arg}\n\n${USAGE}`);
        positional.push(arg);
    }
  }

  if (positional.length === 0) fail(`대상을 지정해주세요.\n\n${USAGE}`);
  if (positional.length > 1) {
    fail(`대상은 하나만 지정할 수 있습니다: ${positional.join(', ')}\n\n${USAGE}`);
  }

  const target = positional[0];
  if (!TARGET_NAMES.includes(target)) {
    const suggestion = suggestTarget(target);
    const hint = suggestion ? `\n혹시 \`${suggestion}\`를 의도하셨나요?` : '';
    fail(`지원하지 않는 대상: ${target}${hint}\n\n${USAGE}`);
  }

  const cwd = process.cwd();
  const home = homedir();
  const { label, results, notes } = run({ target, cwd, home, ...options });

  console.log(`${label} 프리셋${options.dryRun ? ' (dry-run)' : ''} — ${cwd}\n`);
  for (const { path, status } of results) {
    console.log(`  ${STATUS_LABEL[status]}  ${displayPath(path, cwd, home)}`);
  }

  const count = (status) => results.filter((r) => r.status === status).length;
  console.log(
    `\n요약: 생성 ${count('created')} / 덮어씀 ${count('overwritten')} / 건너뜀 ${count('skipped')}` +
      (options.dryRun ? ` / 예정 ${count('dry-run')}` : '')
  );

  const skipped = results.filter((r) => r.status === 'skipped');
  if (skipped.length > 0) {
    console.log(
      `\n이미 존재해 건너뛴 파일이 ${skipped.length}개 있습니다. 덮어쓰려면 \`--force\`를 붙여 다시 실행하세요.`
    );
    for (const { path } of skipped) console.log(`  - ${displayPath(path, cwd, home)}`);
  }

  console.log('\n다음 단계');
  console.log(
    `  1. 프로젝트 지침 문서의 플레이스홀더(<...>)를 채우세요. 특히 §4 검증 명령은 engineer/qa가 그대로 실행합니다.`
  );
  for (const [i, note] of notes.entries()) console.log(`  ${i + 2}. ${note}`);
}

main(process.argv.slice(2));
