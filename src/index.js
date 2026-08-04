import { homedir } from 'node:os';
import { createWriter } from './lib/write.js';
import * as claude from './targets/claude.js';
import * as codex from './targets/codex.js';
import * as cursor from './targets/cursor.js';

export const TARGETS = { claude, codex, cursor };
export const TARGET_NAMES = Object.keys(TARGETS);

export function run({
  target,
  cwd = process.cwd(),
  home = homedir(),
  useGlobal = false,
  force = false,
  dryRun = false,
}) {
  const impl = TARGETS[target];
  if (!impl) throw new Error(`지원하지 않는 대상: ${target}`);

  const writer = createWriter({ force, dryRun });
  const notes = impl.apply({ writer, cwd, home, useGlobal }) ?? [];
  return { label: impl.label, results: writer.results, notes };
}

function distance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    for (let j = 1; j <= b.length; j += 1) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = row;
  }
  return prev[b.length];
}

/** 오타로 보이는 입력에 대해 가장 가까운 대상 이름을 돌려준다. 없으면 null. */
export function suggestTarget(input) {
  const lower = String(input).toLowerCase();
  let best = null;
  let bestDistance = Infinity;
  for (const name of TARGET_NAMES) {
    const d = distance(lower, name);
    if (d < bestDistance) {
      best = name;
      bestDistance = d;
    }
  }
  return bestDistance <= 2 ? best : null;
}
