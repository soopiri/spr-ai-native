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

  it('프로젝트 문서에 §4 검증 항목과 §9 공통 행동 지침이 있다', () => {
    const { cwd } = generate('claude');
    const doc = readFileSync(join(cwd, 'CLAUDE.md'), 'utf8');
    assert.ok(doc.includes('## 4. 검증 항목'));
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

describe('PM 산출물 계약', () => {
  it('pm 진입점에 브리프 게이트와 완료 보고가 정의되어 있다', () => {
    const entrypoints = {
      claude: '.claude/commands/pm.md',
      codex: '.codex/skills/pm/SKILL.md',
      cursor: '.cursor/commands/pm.md',
    };
    for (const [target, file] of Object.entries(entrypoints)) {
      const { cwd } = generate(target);
      const body = readFileSync(join(cwd, file), 'utf8');
      assert.ok(body.includes('pm-brief.md'), `${target}: pm-brief.md 누락`);
      assert.ok(body.includes('pm-report.md'), `${target}: pm-report.md 누락`);
      assert.ok(body.includes('범위: 제외'), `${target}: 범위 제외 지시 누락`);
      assert.ok(
        body.includes('brief 확인 게이트 생략 금지'),
        `${target}: 브리프 게이트 금지 조항 누락`
      );
      assert.ok(body.includes('미완료(에스컬레이션)'), `${target}: 에스컬레이션 판정 누락`);
    }
  });

  it('planner가 pm-brief.md를 유일한 작업 정의 근거로 읽는다', () => {
    const { cwd } = generate('claude');
    const body = readFileSync(join(cwd, '.claude/agents/planner.md'), 'utf8');
    assert.ok(body.includes('pm-brief.md'));
    assert.ok(body.includes('"범위: 제외" 항목을 계획에 넣지 마세요'));
  });

  it('engineer / qa는 PM 산출물 수정이 금지된다', () => {
    const { cwd } = generate('claude');
    for (const role of ['engineer', 'qa']) {
      const body = readFileSync(join(cwd, '.claude/agents', `${role}.md`), 'utf8');
      assert.ok(body.includes('pm-brief.md'), `${role}: pm-brief.md 금지 조항 누락`);
      assert.ok(body.includes('pm-report.md'), `${role}: pm-report.md 금지 조항 누락`);
    }
  });

  it('프로젝트 지침 §5 산출물 표에 PM 파일 2개가 있다', () => {
    for (const [target, file] of Object.entries({
      claude: 'CLAUDE.md',
      codex: 'AGENTS.md',
      cursor: '.cursor/rules/10-project.mdc',
    })) {
      const { cwd } = generate(target);
      const doc = readFileSync(join(cwd, file), 'utf8');
      assert.ok(doc.includes('`pm-brief.md`'), `${target}: pm-brief.md 행 누락`);
      assert.ok(doc.includes('`pm-report.md`'), `${target}: pm-report.md 행 누락`);
    }
  });
});

describe('QA 판정 계약', () => {
  it('전부 N/A일 때 PASS가 아니라 PARTIAL이라고 명시한다', () => {
    for (const [target, file] of Object.entries({
      claude: '.claude/agents/qa.md',
      codex: '.codex/agents/qa.toml',
      cursor: '.cursor/agents/qa.md',
    })) {
      const { cwd } = generate(target);
      const body = readFileSync(join(cwd, file), 'utf8');
      assert.ok(body.includes('N/A 처리 규칙'), `${target}: N/A 처리 규칙 누락`);
      assert.ok(
        body.includes('전부 N/A) 판정은 PARTIAL입니다'),
        `${target}: 전부 N/A → PARTIAL 규칙 누락`
      );
    }
  });
});

describe('작업 예산 제거', () => {
  it('프로젝트 지침 §5에 예산 표가 없다', () => {
    for (const [target, file] of Object.entries({
      claude: 'CLAUDE.md',
      codex: 'AGENTS.md',
      cursor: '.cursor/rules/10-project.mdc',
    })) {
      const { cwd } = generate(target);
      const doc = readFileSync(join(cwd, file), 'utf8');
      assert.ok(!doc.includes('작업 예산'), `${target}: 작업 예산 절이 남아 있습니다`);
      assert.ok(!doc.includes('QA fix 재시도 횟수'), `${target}: fix 재시도 항목이 남아 있습니다`);
    }
  });

  it('통합 계획 모드가 어디에도 없다', () => {
    const { cwd } = generate('claude');
    for (const file of listFiles(cwd)) {
      const content = readFileSync(join(cwd, file), 'utf8');
      assert.ok(!content.includes('Phase 1+2'), `${file}에 통합 모드가 남아 있습니다`);
      assert.ok(!content.includes('계획 단계 ='), `${file}에 계획 단계 노브가 남아 있습니다`);
      assert.ok(!content.includes('작업 예산'), `${file}에 작업 예산 참조가 남아 있습니다`);
    }
  });

  it('planner의 입력 분기가 Phase 1 / Phase 2 둘뿐이다', () => {
    const { cwd } = generate('claude');
    const body = readFileSync(join(cwd, '.claude/agents/planner.md'), 'utf8');
    assert.ok(body.includes('`Phase 1` / `Phase 2` 중 하나가 명시됩니다'));
    assert.ok(!body.includes('(권장안 — 사용자 미확인)'));
  });

  it('pm이 fix 상한을 3으로 고정하고 양쪽 호출 횟수를 밝힌다', () => {
    for (const [target, file] of Object.entries({
      claude: '.claude/commands/pm.md',
      codex: '.codex/skills/pm/SKILL.md',
      cursor: '.cursor/commands/pm.md',
    })) {
      const { cwd } = generate(target);
      const body = readFileSync(join(cwd, file), 'utf8');
      assert.ok(body.includes('engineer fix 재호출은 **최대 3회**'), `${target}: fix 상한 고정 문구 누락`);
      assert.ok(body.includes('engineer 호출은 최대 4회'), `${target}: engineer 호출 횟수 누락`);
      assert.ok(body.includes('qa 호출도 최대 4회'), `${target}: qa 호출 횟수 누락`);
      assert.ok(!body.includes('<F>'), `${target}: <F> 플레이스홀더가 남아 있습니다`);
    }
  });

  it('qa 보고 형식이 전달받지 않는 <최대>를 요구하지 않는다', () => {
    const { cwd } = generate('claude');
    const body = readFileSync(join(cwd, '.claude/agents/qa.md'), 'utf8');
    assert.ok(body.includes('## QA 결과: <task_id> (회차 <N>)'));
    assert.ok(!body.includes('<N>/<최대>'), 'qa가 받지 않는 <최대>를 출력하도록 요구합니다');
  });
});

describe('알려진 약점', () => {
  it('pm 완료 보고에 약점 섹션과 인용 규칙이 있다', () => {
    for (const [target, file] of Object.entries({
      claude: '.claude/commands/pm.md',
      codex: '.codex/skills/pm/SKILL.md',
      cursor: '.cursor/commands/pm.md',
    })) {
      const { cwd } = generate(target);
      const body = readFileSync(join(cwd, file), 'utf8');
      assert.ok(body.includes('## 알려진 약점'), `${target}: 약점 섹션 누락`);
      assert.ok(body.includes('추측이 아니라 인용'), `${target}: 인용 규칙 누락`);
      assert.ok(body.includes('약점을 숨기지 않습니다'), `${target}: 핵심 원칙 누락`);
    }
  });

  it('engineer가 재현 조건이 있는 약점만 보고한다', () => {
    const { cwd } = generate('claude');
    const body = readFileSync(join(cwd, '.claude/agents/engineer.md'), 'utf8');
    assert.ok(body.includes('### 알려진 약점'));
    assert.ok(body.includes('재현 조건을 적을 수 없으면 약점이 아니라 추측입니다'));
  });
});

describe('검증 항목 계약', () => {
  it('§4가 항목·실행 축이며 스택 종속 예시가 없다', () => {
    for (const [target, file] of Object.entries({
      claude: 'CLAUDE.md',
      codex: 'AGENTS.md',
      cursor: '.cursor/rules/10-project.mdc',
    })) {
      const { cwd } = generate(target);
      const doc = readFileSync(join(cwd, file), 'utf8');
      const section4 = doc.slice(doc.indexOf('## 4. 검증 항목'), doc.indexOf('## 5.'));
      assert.ok(section4.includes('| 린트 | 필수 | |'), `${target}: 항목 표 누락`);
      assert.ok(section4.includes('| 포맷 검사 | 안 함 | |'), `${target}: 안 함 값 누락`);
      assert.ok(section4.includes('### 명령을 찾는 방법'), `${target}: 발견 프로토콜 누락`);
      // §4는 특정 패키지 매니저·도구 이름을 전제하지 않아야 한다 (§2 기술 스택은 예외)
      for (const term of ['pnpm', 'npm run', 'pytest', 'yarn']) {
        assert.ok(!section4.includes(term), `${target}: §4에 스택 종속 예시(${term})가 남아 있습니다`);
      }
    }
  });

  it('발견 안전장치 3개가 프로젝트 문서에 있다', () => {
    const { cwd } = generate('claude');
    const doc = readFileSync(join(cwd, 'CLAUDE.md'), 'utf8');
    assert.ok(doc.includes('근거가 없으면 실행하지 않습니다'), '추측 금지 누락');
    assert.ok(doc.includes('끝나지 않는 명령(감시 모드)'), '감시 모드 금지 누락');
    assert.ok(doc.includes('코드를 자동 수정하는 옵션'), '자동 수정 금지 누락');
    assert.ok(doc.includes('N/A(환경 미비)'), '환경 미비 처리 누락');
  });

  it('§4가 테스트와 정적 검사로 나뉜다', () => {
    for (const [target, file] of Object.entries({
      claude: 'CLAUDE.md',
      codex: 'AGENTS.md',
      cursor: '.cursor/rules/10-project.mdc',
    })) {
      const { cwd } = generate(target);
      const doc = readFileSync(join(cwd, file), 'utf8');
      assert.ok(doc.includes('### 테스트'), `${target}: 테스트 표 누락`);
      assert.ok(doc.includes('### 정적 검사'), `${target}: 정적 검사 표 누락`);
      assert.ok(!doc.includes('단일 테스트 실행'), `${target}: 참조되지 않는 행이 남아 있습니다`);
    }
  });

  it('engineer는 표에 되쓰고 qa는 되쓰지 않는다', () => {
    const { cwd } = generate('claude');
    const engineer = readFileSync(join(cwd, '.claude/agents/engineer.md'), 'utf8');
    const qa = readFileSync(join(cwd, '.claude/agents/qa.md'), 'utf8');
    assert.ok(engineer.includes('찾은 명령을 §4의 해당 표에 적어 넣습니다'), 'engineer 역기입 누락');
    assert.ok(qa.includes('§4의 표를 직접 고치지 않습니다'), 'qa 되쓰기 금지 누락');
    for (const body of [engineer, qa]) {
      assert.ok(body.includes('N/A(환경 미비)'), '환경 미비 규칙 누락');
    }
  });
});

describe('README 산출 책임', () => {
  it('engineer가 실행 방법을 쓰되 조건부이며 기존 내용을 보존한다', () => {
    const { cwd } = generate('claude');
    const body = readFileSync(join(cwd, '.claude/agents/engineer.md'), 'utf8');
    assert.ok(body.includes('README 실행 방법 갱신'));
    assert.ok(body.includes('사용자에게 보이는 변화가 있을 때만'), '갱신 조건 누락');
    assert.ok(body.includes('실행 방법에 해당하는 섹션만'), '부분 갱신 규칙 누락');
    assert.ok(body.includes('이름과 예시값만'), '환경변수 규칙 누락');
  });

  it('pm이 README를 쓸 수 있되 실행 방법은 못 건드린다', () => {
    for (const [target, file] of Object.entries({
      claude: '.claude/commands/pm.md',
      codex: '.codex/skills/pm/SKILL.md',
      cursor: '.cursor/commands/pm.md',
    })) {
      const { cwd } = generate(target);
      const body = readFileSync(join(cwd, file), 'utf8');
      assert.ok(body.includes('### README 정리'), `${target}: README 정리 단계 누락`);
      assert.ok(
        body.includes('`pm-brief.md`, `pm-report.md`, `README.md` 외의 파일 작성 금지'),
        `${target}: README 작성 허용 누락`
      );
      assert.ok(
        body.includes('README의 실행 방법 섹션 수정 금지'),
        `${target}: 실행 방법 보호 조항 누락`
      );
    }
  });

  it('프로젝트 지침 §5에 README 작성자가 명시된다', () => {
    for (const [target, file] of Object.entries({
      claude: 'CLAUDE.md',
      codex: 'AGENTS.md',
      cursor: '.cursor/rules/10-project.mdc',
    })) {
      const { cwd } = generate(target);
      const doc = readFileSync(join(cwd, file), 'utf8');
      assert.ok(doc.includes('| `README.md` | engineer(실행 방법) → pm('), `${target}: README 행 누락`);
    }
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
    assert.ok(readFileSync(join(cwd, 'CLAUDE.md'), 'utf8').includes('## 4. 검증 항목'));
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
    assert.ok(!globalDoc.includes('## 4. 검증 항목'));

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
