import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { rmSync } from 'node:fs';
import { parseDoc } from '../src/lib/preset.js';
import { run } from '../src/index.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ROOT, 'bin', 'cli.js');
const tempDirs = [];

function sandbox() {
  const cwd = mkdtempSync(join(tmpdir(), 'spr-cwd-'));
  const home = mkdtempSync(join(tmpdir(), 'spr-home-'));
  tempDirs.push(cwd, home);
  return { cwd, home };
}

function generate(target, options = {}) {
  const { cwd, home } = sandbox();
  const result = run({ target, cwd, home, ...options });
  return { cwd, home, ...result };
}

function listFiles(dir, prefix = '') {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(join(dir, entry.name), rel));
    else out.push(rel);
  }
  return out.sort();
}

after(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

const EXPECTED = {
  claude: [
    'CLAUDE.md',
    '.claude/agents/planner.md',
    '.claude/agents/engineer.md',
    '.claude/agents/qa.md',
    '.claude/commands/pm.md',
    '.claude/commands/planner.md',
    '.claude/commands/engineer.md',
    '.claude/commands/qa.md',
  ],
  codex: [
    'AGENTS.md',
    '.codex/agents/planner.toml',
    '.codex/agents/engineer.toml',
    '.codex/agents/qa.toml',
    '.codex/skills/pm/SKILL.md',
    '.codex/skills/planner/SKILL.md',
    '.codex/skills/engineer/SKILL.md',
    '.codex/skills/qa/SKILL.md',
  ],
  cursor: [
    '.cursor/rules/00-base.mdc',
    '.cursor/rules/10-project.mdc',
    '.cursor/agents/planner.md',
    '.cursor/agents/engineer.md',
    '.cursor/agents/qa.md',
    '.cursor/commands/pm.md',
    '.cursor/commands/planner.md',
    '.cursor/commands/engineer.md',
    '.cursor/commands/qa.md',
  ],
};

describe('파일 트리', () => {
  for (const [target, expected] of Object.entries(EXPECTED)) {
    it(`${target}: 기대 파일이 모두 생성된다`, () => {
      const { cwd } = generate(target);
      assert.deepEqual(listFiles(cwd), [...expected].sort());
    });
  }
});

describe('플레이스홀더', () => {
  for (const target of Object.keys(EXPECTED)) {
    it(`${target}: 생성물에 미치환 플레이스홀더가 없다`, () => {
      const { cwd } = generate(target);
      for (const file of listFiles(cwd)) {
        const content = readFileSync(join(cwd, file), 'utf8');
        assert.ok(!content.includes('{{'), `${file}에 미치환 플레이스홀더가 있습니다`);
      }
    });
  }
});

describe('claude frontmatter', () => {
  it('서브에이전트에 name / description / model / tools가 있다', () => {
    const { cwd } = generate('claude');
    for (const role of ['planner', 'engineer', 'qa']) {
      const { meta, body } = parseDoc(readFileSync(join(cwd, '.claude/agents', `${role}.md`), 'utf8'));
      assert.equal(meta.name, role);
      assert.equal(meta.model, 'inherit');
      assert.ok(meta.description?.length > 10, `${role} description 누락`);
      assert.ok(meta.tools?.includes('Read'), `${role} tools 누락`);
      assert.ok(body.length > 500, `${role} 본문이 비었습니다`);
    }
  });

  it('커맨드에 description / argument-hint가 있다', () => {
    const { cwd } = generate('claude');
    for (const name of ['pm', 'planner', 'engineer', 'qa']) {
      const { meta, body } = parseDoc(readFileSync(join(cwd, '.claude/commands', `${name}.md`), 'utf8'));
      assert.ok(meta.description?.length > 10, `${name} description 누락`);
      assert.ok(meta['argument-hint'], `${name} argument-hint 누락`);
      assert.ok(body.includes('$ARGUMENTS'), `${name}에 $ARGUMENTS가 없습니다`);
    }
  });

  it('프로젝트 문서에 §4 검증 명령과 §9 공통 행동 지침이 있다', () => {
    const { cwd } = generate('claude');
    const doc = readFileSync(join(cwd, 'CLAUDE.md'), 'utf8');
    assert.ok(doc.includes('## 4. 검증 명령'));
    assert.ok(doc.includes('## 9. 공통 행동 지침'));
    assert.ok(doc.includes('단순함이 먼저입니다'));
  });
});

describe('codex 생성물', () => {
  it('TOML에 필수 3개 키가 있고 리터럴 문자열이 닫힌다', () => {
    const { cwd } = generate('codex');
    for (const role of ['planner', 'engineer', 'qa']) {
      const toml = readFileSync(join(cwd, '.codex/agents', `${role}.toml`), 'utf8');
      assert.match(toml, new RegExp(`^name = "${role}"$`, 'm'));
      assert.match(toml, /^description = ".+"$/m);
      assert.match(toml, /^developer_instructions = '''$/m);
      // 리터럴 문자열 구분자는 열고 닫는 2개만 존재해야 한다
      assert.equal(toml.match(/'''/g).length, 2, `${role}: ''' 개수가 2개가 아닙니다`);
      assert.ok(toml.trimEnd().endsWith("'''"), `${role}: 리터럴 문자열이 닫히지 않았습니다`);
    }
  });

  it('스킬에 name / description frontmatter가 있다', () => {
    const { cwd } = generate('codex');
    for (const name of ['pm', 'planner', 'engineer', 'qa']) {
      const { meta, body } = parseDoc(
        readFileSync(join(cwd, '.codex/skills', name, 'SKILL.md'), 'utf8')
      );
      assert.equal(meta.name, name);
      assert.ok(meta.description?.length > 10, `${name} description 누락`);
      assert.ok(body.length > 200, `${name} 본문이 비었습니다`);
    }
  });

  it('프로젝트 문서가 AGENTS.md이고 CLAUDE.md는 만들지 않는다', () => {
    const { cwd } = generate('codex');
    assert.ok(existsSync(join(cwd, 'AGENTS.md')));
    assert.ok(!existsSync(join(cwd, 'CLAUDE.md')));
  });
});

describe('cursor 생성물', () => {
  it('규칙이 .mdc이며 alwaysApply: true이다', () => {
    const { cwd } = generate('cursor');
    for (const file of ['00-base.mdc', '10-project.mdc']) {
      const { meta } = parseDoc(readFileSync(join(cwd, '.cursor/rules', file), 'utf8'));
      assert.equal(meta.alwaysApply, 'true');
      assert.ok(meta.description?.length > 5, `${file} description 누락`);
    }
  });

  it('서브에이전트에 readonly가 있고 qa만 readonly: true이다', () => {
    const { cwd } = generate('cursor');
    const readonly = {};
    for (const role of ['planner', 'engineer', 'qa']) {
      const { meta } = parseDoc(readFileSync(join(cwd, '.cursor/agents', `${role}.md`), 'utf8'));
      assert.equal(meta.model, 'inherit');
      readonly[role] = meta.readonly;
    }
    assert.deepEqual(readonly, { planner: 'false', engineer: 'false', qa: 'true' });
  });

  it('CLAUDE.md / AGENTS.md는 만들지 않는다', () => {
    const { cwd } = generate('cursor');
    assert.ok(!existsSync(join(cwd, 'CLAUDE.md')));
    assert.ok(!existsSync(join(cwd, 'AGENTS.md')));
  });

  it('--global은 파일을 만들지 않고 안내만 남긴다', () => {
    const { home, results, notes } = generate('cursor', { useGlobal: true });
    assert.equal(listFiles(home).length, 0);
    assert.ok(results.every((r) => !r.path.startsWith(home)));
    assert.ok(notes.some((n) => n.includes('User Rules')));
  });
});

describe('기존 파일 처리', () => {
  it('기본 동작은 건너뛰기이며 내용이 보존된다', () => {
    const { cwd, home } = sandbox();
    writeFileSync(join(cwd, 'CLAUDE.md'), 'MY EXISTING DOC\n');
    const { results } = run({ target: 'claude', cwd, home });

    const doc = results.find((r) => r.path === join(cwd, 'CLAUDE.md'));
    assert.equal(doc.status, 'skipped');
    assert.equal(readFileSync(join(cwd, 'CLAUDE.md'), 'utf8'), 'MY EXISTING DOC\n');
  });

  it('--force는 덮어쓴다', () => {
    const { cwd, home } = sandbox();
    writeFileSync(join(cwd, 'CLAUDE.md'), 'MY EXISTING DOC\n');
    const { results } = run({ target: 'claude', cwd, home, force: true });

    const doc = results.find((r) => r.path === join(cwd, 'CLAUDE.md'));
    assert.equal(doc.status, 'overwritten');
    assert.ok(readFileSync(join(cwd, 'CLAUDE.md'), 'utf8').includes('## 4. 검증 명령'));
  });
});

describe('--dry-run', () => {
  it('파일을 만들지 않는다', () => {
    const { cwd, results } = generate('cursor', { dryRun: true });
    assert.equal(listFiles(cwd).length, 0);
    assert.ok(results.every((r) => r.status === 'dry-run'));
  });

  it('--global과 함께 써도 홈 디렉터리를 건드리지 않는다', () => {
    const { home, results } = generate('codex', { useGlobal: true, dryRun: true });
    assert.equal(listFiles(home).length, 0);
    assert.ok(results.some((r) => r.path === join(home, '.codex', 'AGENTS.md')));
  });
});

describe('--global 설치', () => {
  it('claude: 전역 파일에 공통 행동 지침만 쓰고, 프로젝트 문서 §9는 전역을 가리킨다', () => {
    const { cwd, home } = generate('claude', { useGlobal: true });
    const globalDoc = readFileSync(join(home, '.claude', 'CLAUDE.md'), 'utf8');
    assert.ok(globalDoc.includes('단순함이 먼저입니다'));
    assert.ok(!globalDoc.includes('## 4. 검증 명령'));

    const projectDoc = readFileSync(join(cwd, 'CLAUDE.md'), 'utf8');
    assert.ok(projectDoc.includes('~/.claude/CLAUDE.md'));
    assert.ok(!projectDoc.includes('단순함이 먼저입니다'));
  });
});

describe('CLI 인자 처리', () => {
  const cli = (args, cwd) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' });

  it('대상 없이 실행하면 exit 1과 사용법을 출력한다', () => {
    const { cwd } = sandbox();
    const out = cli([], cwd);
    assert.equal(out.status, 1);
    assert.match(out.stderr, /사용법: npx spr-ai-native/);
  });

  it('오타 대상에 대해 유사 대상을 제안한다', () => {
    const { cwd } = sandbox();
    const out = cli(['claue'], cwd);
    assert.equal(out.status, 1);
    assert.match(out.stderr, /혹시 `claude`를 의도하셨나요\?/);
  });

  it('알 수 없는 대상에 제안이 없으면 사용법만 출력한다', () => {
    const { cwd } = sandbox();
    const out = cli(['copilot'], cwd);
    assert.equal(out.status, 1);
    assert.ok(!out.stderr.includes('의도하셨나요'));
  });

  it('대상을 2개 지정하면 실패한다', () => {
    const { cwd } = sandbox();
    assert.equal(cli(['claude', 'codex'], cwd).status, 1);
  });

  it('알 수 없는 옵션은 실패한다', () => {
    const { cwd } = sandbox();
    assert.equal(cli(['claude', '--all'], cwd).status, 1);
  });

  it('정상 실행은 exit 0이며 요약을 출력한다', () => {
    const { cwd } = sandbox();
    const out = cli(['claude'], cwd);
    assert.equal(out.status, 0);
    assert.match(out.stdout, /요약: 생성 8/);
    assert.match(out.stdout, /다음 단계/);
  });

  it('건너뛴 파일이 있으면 --force 안내를 출력한다', () => {
    const { cwd } = sandbox();
    writeFileSync(join(cwd, 'CLAUDE.md'), 'x\n');
    const out = cli(['claude'], cwd);
    assert.match(out.stdout, /--force/);
  });
});
