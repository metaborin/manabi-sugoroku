import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const base = process.env.PUBLIC_URL ?? 'https://metaborin.github.io/manabi-sugoroku/';
const sha256 = data => createHash('sha256').update(data).digest('hex');
async function filesIn(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(entries.map(entry => entry.isDirectory()
    ? filesIn(path.join(directory, entry.name), `${prefix}${entry.name}/`)
    : [`${prefix}${entry.name}`]));
  return groups.flat();
}
const files = await filesIn('dist');
const checks = await Promise.all(files.map(async file => {
  const local = await readFile(path.join('dist', file));
  const response = await fetch(new URL(file === 'index.html' ? '' : file, base), { cache: 'no-store' });
  const remote = Buffer.from(await response.arrayBuffer());
  return { file, status: response.status, bytes: remote.length, sha256: sha256(remote), matchesBuild: response.ok && sha256(local) === sha256(remote) };
}));
const report = { checkedAt: new Date().toISOString(), base, commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), files: checks, success: checks.every(check => check.matchesBuild) };
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/published-verification.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.success) process.exitCode = 1;
