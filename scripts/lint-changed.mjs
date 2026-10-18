#!/usr/bin/env node
/**
 * Lints only the files changed in the working tree (staged, unstaged and
 * untracked) instead of the whole repository. Run it with `yarn lint:changed`
 * for a fast local loop; `yarn lint` and `yarn lint:all` remain full passes.
 *
 * Falls back to a full lint only when git is unavailable or the current
 * directory is not inside a repository. Any other git failure is surfaced so
 * the developer can fix it instead of silently linting a different scope.
 */
import { execFileSync } from 'node:child_process';
import { extname } from 'node:path';
import { ESLint } from 'eslint';

const GIT_OPTIONS = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] };

/** Extensions eslint is configured to handle in this repository. */
const EXTENSIONS = new Set(['.ts', '.tsx']);

/**
 * True only for the two expected "there is nothing to diff" cases: the git
 * binary is missing, or the working directory is not inside a repository.
 */
function isGitUnavailable(error) {
  if (error?.code === 'ENOENT') {
    return true;
  }
  const stderr = typeof error?.stderr === 'string' ? error.stderr : '';
  return /not a git repository/i.test(stderr);
}

function gitLines(args) {
  return execFileSync('git', args, GIT_OPTIONS)
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
}

let repoRoot = process.cwd();
let targets = null;

try {
  repoRoot = execFileSync(
    'git',
    ['rev-parse', '--show-toplevel'],
    GIT_OPTIONS,
  ).trim();
  process.chdir(repoRoot);

  const changed = new Set([
    ...gitLines(['diff', '--name-only', '--diff-filter=ACMR']),
    ...gitLines(['diff', '--name-only', '--diff-filter=ACMR', '--cached']),
    ...gitLines(['ls-files', '--others', '--exclude-standard']),
  ]);

  targets = [...changed].filter((file) => EXTENSIONS.has(extname(file)));
} catch (error) {
  if (!isGitUnavailable(error)) {
    throw error;
  }
  console.warn(
    'lint: git is not available, linting the whole repository instead.',
  );
}

if (targets !== null && targets.length === 0) {
  console.log('lint: no changed files to lint.');
  process.exit(0);
}

const eslint = new ESLint({ cwd: repoRoot, warnIgnored: false });
const results = await eslint.lintFiles(targets ?? ['.']);
const formatter = await eslint.loadFormatter('stylish');
const report = formatter.format(results);

if (report.trim().length > 0) {
  process.stdout.write(report);
}

process.exitCode = ESLint.getErrorResults(results).length > 0 ? 1 : 0;
