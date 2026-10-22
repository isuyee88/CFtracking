#!/usr/bin/env node
// Builds gate for the self-contained deploy/prod artifact. The artifact is generated, so these
// assertions are the only thing standing between a bad release build and a Worker deploy that
// silently loses the automation scheduler (its alarms stop firing, and the DO namespace cannot
// be re-created under the same migration tag).
//
// Contract under test:
//   - worker.js is self-contained (no cftracking-plugins import) and exports AutomationSchedulerDO;
//   - wrangler.toml binds AUTOMATION_DO to that class;
//   - wrangler.toml declares the v11 migration that created the SQLite-backed DO class;
//   - assets/index.html shipped with the artifact;
//   - no secret literal was baked into the generated bundle.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const AUTOMATION_DO_BINDING = 'AUTOMATION_DO';
export const AUTOMATION_DO_CLASS = 'AutomationSchedulerDO';
export const AUTOMATION_MIGRATION_TAG = 'v11';

const SECRET_PATTERNS = [
  /CLOUDFLARE_API_TOKEN\s*[:=]\s*['"][^'"]{8,}/,
  /D1_ACCESS_KEY\s*[:=]\s*['"][^'"]{8,}/,
  /POSTBACK_KEY\s*[:=]\s*['"][^'"]{8,}/,
  /BRIGHTDATA_API_KEY\s*[:=]\s*['"][^'"]{8,}/,
];

/**
 * Validate one generated deploy/prod artifact.
 *
 * Pure function: no filesystem access, so the same contract can be exercised by fixtures.
 *
 * @param {{ worker: string, wranglerToml: string, assetsIndexExists: boolean }} artifact
 * @returns {string[]} actionable failure reasons; an empty array means the artifact is deployable.
 * @throws {TypeError} when worker/wranglerToml are not strings.
 */
export function checkBundle({ worker, wranglerToml, assetsIndexExists }) {
  if (typeof worker !== 'string' || typeof wranglerToml !== 'string') {
    throw new TypeError('checkBundle requires worker and wranglerToml strings');
  }

  const errors = [];

  if (
    /(?:^|\n)\s*(?:import|export)\s+[^;\n]*cftracking-plugins/.test(worker) ||
    worker.includes('require("../../cftracking-plugins')
  ) {
    errors.push(
      'worker.js still imports cftracking-plugins; the release build must inline every plugin module',
    );
  }

  const exported = exportedNames(worker);
  if (!exported.has(AUTOMATION_DO_CLASS)) {
    errors.push(
      `worker.js does not export ${AUTOMATION_DO_CLASS}; the release build is missing the automation scheduler plugin`,
    );
  }

  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(worker)) {
      errors.push(`possible secret literal in worker.js (matched ${pattern})`);
    }
  }

  if (!assetsIndexExists) {
    errors.push('missing assets/index.html; deploy/prod must ship the built frontend assets');
  }

  const tables = parseTomlTables(wranglerToml);
  checkAutomationBinding(tables, errors);
  checkAutomationMigration(tables, errors);

  return errors;
}

/** @param {{name: string, entries: Record<string, string>}[]} tables @param {string[]} errors */
function checkAutomationBinding(tables, errors) {
  const bindings = tables.filter((table) => table.name === 'durable_objects.bindings');
  const automation = bindings.find(
    (table) => parseTomlString(table.entries.name) === AUTOMATION_DO_BINDING,
  );

  if (!automation) {
    errors.push(
      `wrangler.toml has no [[durable_objects.bindings]] with name = "${AUTOMATION_DO_BINDING}"; ` +
        'without the binding the exported DO class is never reachable at runtime',
    );
    return;
  }

  const className = parseTomlString(automation.entries.class_name);
  if (className !== AUTOMATION_DO_CLASS) {
    errors.push(
      `wrangler.toml ${AUTOMATION_DO_BINDING} binds class_name = "${className ?? ''}", expected ` +
        `"${AUTOMATION_DO_CLASS}"`,
    );
  }
}

/** @param {{name: string, entries: Record<string, string>}[]} tables @param {string[]} errors */
function checkAutomationMigration(tables, errors) {
  const v11 = tables.find(
    (table) =>
      table.name === 'migrations' &&
      parseTomlString(table.entries.tag) === AUTOMATION_MIGRATION_TAG,
  );

  if (!v11) {
    errors.push(
      `wrangler.toml has no [[migrations]] tag = "${AUTOMATION_MIGRATION_TAG}"; the deployed ` +
        `${AUTOMATION_DO_CLASS} namespace was created by that migration, so the artifact must ` +
        'carry it or the next deploy drops the class',
    );
    return;
  }

  const sqliteClasses = parseTomlStringArray(v11.entries.new_sqlite_classes);
  if (!sqliteClasses.includes(AUTOMATION_DO_CLASS)) {
    errors.push(
      `wrangler.toml migration "${AUTOMATION_MIGRATION_TAG}" does not list ` +
        `"${AUTOMATION_DO_CLASS}" in new_sqlite_classes (got [${sqliteClasses.join(', ')}])`,
    );
  }
}

// ---------------------------------------------------------------------------
// worker.js export inspection
// ---------------------------------------------------------------------------

/**
 * Named exports of an ES module, parsed from the source. Comments, strings, templates and regex
 * literals are blanked first: a `AutomationSchedulerDO` mention in a comment or a string must not
 * satisfy the gate, and a nested mention must not hide a missing export clause.
 *
 * @param {string} source
 * @returns {Set<string>}
 */
export function exportedNames(source) {
  const code = stripNonCode(source);
  const names = new Set();

  for (const match of code.matchAll(/\bexport\s*\{([^}]*)\}/g)) {
    for (const raw of match[1].split(',')) {
      const specifier = raw.trim();
      if (!specifier) continue;
      const asIndex = specifier.search(/\sas\s/);
      const name = (asIndex === -1 ? specifier : specifier.slice(asIndex + 4)).trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
  }

  for (const match of code.matchAll(
    /\bexport\s+(?:async\s+)?(?:class|function\*?|const|let|var)\s+([A-Za-z_$][\w$]*)/g,
  )) {
    names.add(match[1]);
  }

  return names;
}

// Tokens after which a `/` starts a regex literal rather than a division. Needed because regex
// bodies may contain `//` or quotes, which would otherwise be mistaken for a comment/string.
const REGEX_PRECEDERS = new Set([
  '', '(', '[', '{', ',', ';', ':', '=', '!', '&', '|', '?', '+', '-', '*', '%', '^', '~', '<', '>',
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'case', 'do', 'else',
  'yield', 'await', '=>',
]);

/**
 * Replace every non-code character with a space while preserving offsets and newlines, so the
 * export regexes only ever see real tokens.
 *
 * @param {string} source
 * @returns {string}
 */
function stripNonCode(source) {
  const chars = source.split('');
  const blank = (start, end) => {
    for (let k = start; k < end; k += 1) {
      if (chars[k] !== '\n' && chars[k] !== '\r') chars[k] = ' ';
    }
  };

  let previous = '';
  let i = 0;
  while (i < source.length) {
    const char = source[i];
    const next = source[i + 1];

    if (char === '/' && next === '/') {
      const newline = source.indexOf('\n', i);
      const end = newline === -1 ? source.length : newline;
      blank(i, end);
      i = end;
      continue;
    }

    if (char === '/' && next === '*') {
      const close = source.indexOf('*/', i + 2);
      const end = close === -1 ? source.length : close + 2;
      blank(i, end);
      i = end;
      continue;
    }

    if (char === '"' || char === "'") {
      let j = i + 1;
      while (j < source.length) {
        if (source[j] === '\\') {
          j += 2;
          continue;
        }
        if (source[j] === char) {
          j += 1;
          break;
        }
        if (source[j] === '\n') break;
        j += 1;
      }
      blank(i, j);
      i = j;
      previous = 'literal';
      continue;
    }

    if (char === '`') {
      let j = i + 1;
      while (j < source.length) {
        if (source[j] === '\\') {
          j += 2;
          continue;
        }
        if (source[j] === '`') {
          j += 1;
          break;
        }
        if (source[j] === '$' && source[j + 1] === '{') {
          let depth = 1;
          j += 2;
          while (j < source.length && depth > 0) {
            if (source[j] === '{') depth += 1;
            else if (source[j] === '}') depth -= 1;
            j += 1;
          }
          continue;
        }
        j += 1;
      }
      blank(i, j);
      i = j;
      previous = 'literal';
      continue;
    }

    if (char === '/' && REGEX_PRECEDERS.has(previous)) {
      let j = i + 1;
      let inClass = false;
      let closed = false;
      while (j < source.length) {
        const ch = source[j];
        if (ch === '\\') {
          j += 2;
          continue;
        }
        if (ch === '[') inClass = true;
        else if (ch === ']') inClass = false;
        else if (ch === '/' && !inClass) {
          j += 1;
          closed = true;
          break;
        } else if (ch === '\n') break;
        j += 1;
      }
      if (closed) {
        while (/[a-z]/i.test(source[j] ?? '')) j += 1;
        blank(i, j);
        i = j;
        previous = 'literal';
        continue;
      }
      // Not a regex after all (e.g. division followed by a newline); fall through as punctuation.
    }

    if (/[A-Za-z_$]/.test(char)) {
      let j = i + 1;
      while (j < source.length && /[\w$]/.test(source[j])) j += 1;
      previous = source.slice(i, j);
      i = j;
      continue;
    }

    if (/[0-9]/.test(char)) {
      let j = i + 1;
      while (j < source.length && /[\w.]/.test(source[j])) j += 1;
      previous = '0';
      i = j;
      continue;
    }

    if (!/\s/.test(char)) previous = char;
    i += 1;
  }

  return chars.join('');
}

// ---------------------------------------------------------------------------
// Just enough TOML to read wrangler.toml structurally instead of grepping for substrings
// (a commented-out binding or a stale `class_name = "..."` elsewhere must not pass).
// ---------------------------------------------------------------------------

/**
 * @param {string} text
 * @returns {{ name: string, entries: Record<string, string> }[]}
 */
function parseTomlTables(text) {
  const lines = text.split(/\r?\n/);
  const tables = [];
  let current = null;

  for (const rawLine of lines) {
    const line = stripTomlComment(rawLine).trim();
    if (!line) continue;

    const arrayTable = line.match(/^\[\[([^\]]+)\]\]$/);
    if (arrayTable) {
      current = { name: arrayTable[1].trim(), entries: {} };
      tables.push(current);
      continue;
    }

    const table = line.match(/^\[([^\]]+)\]$/);
    if (table) {
      current = { name: table[1].trim(), entries: {} };
      tables.push(current);
      continue;
    }

    if (!current) continue;
    const equals = line.indexOf('=');
    if (equals === -1) continue;

    const key = line.slice(0, equals).trim();
    let value = line.slice(equals + 1).trim();

    // Join multi-line arrays so a wrapped new_sqlite_classes list stays one value.
    if (value.startsWith('[') && !value.includes(']')) {
      let index = lines.indexOf(rawLine);
      while (index + 1 < lines.length && !value.includes(']')) {
        index += 1;
        value += ' ' + stripTomlComment(lines[index]).trim();
      }
    }

    current.entries[key] = value;
  }

  return tables;
}

/**
 * @param {string} line
 * @returns {string}
 */
function stripTomlComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quote) {
      if (char === '\\' && quote === '"') i += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '#') return line.slice(0, i);
  }
  return line;
}

/**
 * @param {string | undefined} value
 * @returns {string | undefined}
 */
function parseTomlString(value) {
  if (!value) return undefined;
  const match = value.match(/^\s*(['"])(.*)\1\s*$/);
  return match ? match[2] : value.trim();
}

/**
 * @param {string | undefined} value
 * @returns {string[]}
 */
function parseTomlStringArray(value) {
  if (!value) return [];
  return [...value.matchAll(/['"]([^'"]*)['"]/g)].map((match) => match[1]);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main() {
  const worker = readFileSync(new URL('../worker.js', import.meta.url), 'utf8');
  const wranglerToml = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
  const assetsIndexExists = existsSync(new URL('../assets/index.html', import.meta.url));

  const errors = checkBundle({ worker, wranglerToml, assetsIndexExists });
  if (errors.length > 0) {
    console.error('bundle contract check failed:');
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  console.log(`bundle check ok, bytes=${worker.length}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
