import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * 파일 생성기. 기존 파일은 기본적으로 건너뛰고, force일 때만 덮어쓴다.
 * status: created | overwritten | skipped | dry-run
 */
export function createWriter({ force = false, dryRun = false } = {}) {
  const results = [];

  return {
    results,
    write(path, content) {
      const exists = existsSync(path);
      let status;

      if (exists && !force) {
        status = 'skipped';
      } else if (dryRun) {
        status = 'dry-run';
      } else {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, content, 'utf8');
        status = exists ? 'overwritten' : 'created';
      }

      results.push({ path, status });
      return status;
    },
  };
}

/** YAML / TOML 공통 큰따옴표 문자열. */
export function quoted(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function frontmatter(entries) {
  const lines = [];
  for (const entry of entries) {
    if (typeof entry === 'string') lines.push(entry); // 주석 등 원문 그대로
    else lines.push(`${entry[0]}: ${entry[1]}`);
  }
  return `---\n${lines.join('\n')}\n---\n`;
}
