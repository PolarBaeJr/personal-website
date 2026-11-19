// Self-check for the journal entry trainer: scenario data and grader.
//   node scripts/check-journal-scenarios.ts
import {
  ACCOUNTS,
  SCENARIOS,
  accountName,
  type EntryLine,
} from "../src/content/journal-scenarios.ts";
import {
  formatCents,
  gradeEntry,
  parseAmount,
  sumSides,
  type Feedback,
} from "../src/lib/journal-grade.ts";

let failures = 0;

function fail(message: string) {
  failures++;
  console.error(`FAIL ${message}`);
}

function has(feedback: Feedback[], kind: Feedback["kind"]): boolean {
  return feedback.some((item) => item.kind === kind);
}

const accountIds = new Set<string>(ACCOUNTS.map((account) => account.id));
const ids = new Set(SCENARIOS.map((scenario) => scenario.id));
if (ids.size !== SCENARIOS.length) fail("scenario ids are not unique");
if (SCENARIOS.length !== 22) {
  fail(`expected 22 scenarios, found ${SCENARIOS.length}`);
}

const usedAccounts = new Set<string>();
for (const scenario of SCENARIOS) {
  for (const entry of [scenario.lines, ...(scenario.alternatives ?? [])]) {
    for (const line of entry) usedAccounts.add(line.account);
  }
}
const distractor = ACCOUNTS.find((account) => !usedAccounts.has(account.id));
if (!distractor) fail("no distractor account is left unused");

for (const scenario of SCENARIOS) {
  const name = scenario.id;
  const candidates = [scenario.lines, ...(scenario.alternatives ?? [])];

  candidates.forEach((entry, c) => {
    const label = c === 0 ? name : `${name} alternative ${c}`;
    if (entry.length < 2) fail(`${label}: fewer than 2 lines`);
    if (!entry.some((line) => line.side === "debit")) {
      fail(`${label}: no debit line`);
    }
    if (!entry.some((line) => line.side === "credit")) {
      fail(`${label}: no credit line`);
    }
    const seen = new Set<string>();
    for (const line of entry) {
      if (!accountIds.has(line.account)) {
        fail(`${label}: unknown account ${line.account}`);
      }
      if (!Number.isInteger(line.cents) || line.cents <= 0) {
        fail(`${label}: bad amount ${line.cents}`);
      }
      const key = `${line.account}:${line.side}`;
      if (seen.has(key)) fail(`${label}: repeats ${key}`);
      seen.add(key);
    }
    const totals = sumSides(entry);
    if (totals.debit !== totals.credit) {
      fail(`${label}: debits ${totals.debit} != credits ${totals.credit}`);
    }
    if (!gradeEntry(entry, candidates, accountName).correct) {
      fail(`${label}: does not grade correct`);
    }
    if (!gradeEntry([...entry].reverse(), candidates, accountName).correct) {
      fail(`${label}: reversed order does not grade correct`);
    }
  });

  const lines = scenario.lines;
  const first = lines[0];

  const flipped: EntryLine[] = [
    { ...first, side: first.side === "debit" ? "credit" : "debit" },
    ...lines.slice(1),
  ];
  const flippedResult = gradeEntry(flipped, candidates, accountName);
  if (flippedResult.correct || !has(flippedResult.feedback, "wrong-side")) {
    fail(`${name}: flipped side not reported as wrong-side`);
  }

  const bumped: EntryLine[] = [
    { ...first, cents: first.cents + 100 },
    ...lines.slice(1),
  ];
  const bumpedResult = gradeEntry(bumped, candidates, accountName);
  if (
    !has(bumpedResult.feedback, "wrong-amount") ||
    !has(bumpedResult.feedback, "unbalanced")
  ) {
    fail(`${name}: changed amount not reported as wrong-amount and unbalanced`);
  }

  const dropped = lines.slice(0, -1);
  if (!has(gradeEntry(dropped, candidates, accountName).feedback, "missing")) {
    fail(`${name}: dropped line not reported as missing`);
  }

  const extra: EntryLine[] = [
    ...lines,
    { account: "utilities-expense", side: "debit", cents: 1 },
  ];
  if (!has(gradeEntry(extra, candidates, accountName).feedback, "extra")) {
    fail(`${name}: added line not reported as extra`);
  }

  if (distractor) {
    const swapped: EntryLine[] = [
      { ...first, account: distractor.id },
      ...lines.slice(1),
    ];
    const swappedResult = gradeEntry(swapped, candidates, accountName);
    if (!has(swappedResult.feedback, "wrong-account")) {
      fail(`${name}: swapped account not reported as wrong-account`);
    }
  }
}

const validAmounts: [string, number][] = [
  ["1,200", 120000],
  ["$1200.00", 120000],
  ["1200.5", 120050],
  [".5", 50],
  [" $ 25,000 ", 2500000],
];
for (const [raw, cents] of validAmounts) {
  const result = parseAmount(raw);
  if (!result.ok || result.cents !== cents) {
    fail(`parseAmount(${JSON.stringify(raw)}) should be ${cents}`);
  }
}

for (const raw of ["12.345", "1,20", "abc", "-5", "1.2.3"]) {
  const result = parseAmount(raw);
  if (result.ok || result.reason !== "invalid") {
    fail(`parseAmount(${JSON.stringify(raw)}) should be invalid`);
  }
}

const zero = parseAmount("0");
if (zero.ok || zero.reason !== "zero") fail(`parseAmount("0") should be zero`);
const empty = parseAmount("");
if (empty.ok || empty.reason !== "empty") {
  fail(`parseAmount("") should be empty`);
}

if (formatCents(120000) !== "$1,200.00") {
  fail(`formatCents(120000) gave ${formatCents(120000)}`);
}

if (failures) {
  console.error(`${failures} check(s) failed`);
} else {
  console.log(`All checks passed for ${SCENARIOS.length} scenarios`);
}
process.exit(failures ? 1 : 0);
