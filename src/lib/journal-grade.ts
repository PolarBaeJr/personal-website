import type { AccountId, EntryLine } from "../content/journal-scenarios.ts";

export type ParsedAmount =
  | { ok: true; cents: number }
  | { ok: false; reason: "empty" | "invalid" | "zero" };

export type Feedback = {
  kind:
    | "unbalanced"
    | "duplicate"
    | "wrong-amount"
    | "wrong-side"
    | "wrong-account"
    | "extra"
    | "missing";
  message: string;
  line?: number;
};

export type GradeResult = {
  correct: boolean;
  solutionIndex: number;
  debit: number;
  credit: number;
  feedback: Feedback[];
};

export function parseAmount(raw: string): ParsedAmount {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: false, reason: "empty" };

  let text = trimmed.replace(/^c?a?\s*\$/i, "").replace(/[\s$]/g, "");
  if (text.includes(",")) {
    if (!/^\d{1,3}(,\d{3})+(\.\d{0,2})?$/.test(text)) {
      return { ok: false, reason: "invalid" };
    }
    text = text.replace(/,/g, "");
  } else if (!/^\d*(\.\d{0,2})?$/.test(text) || !/\d/.test(text)) {
    return { ok: false, reason: "invalid" };
  }

  const [whole, frac = ""] = text.split(".");
  if (whole.length > 9) return { ok: false, reason: "invalid" };

  const cents = Number(whole || "0") * 100 + Number(frac.padEnd(2, "0"));
  if (cents === 0) return { ok: false, reason: "zero" };
  return { ok: true, cents };
}

const cad = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

export function formatCents(cents: number): string {
  return cad.format(cents / 100);
}

export function sumSides(lines: EntryLine[]): {
  debit: number;
  credit: number;
} {
  let debit = 0;
  let credit = 0;
  for (const line of lines) {
    if (line.side === "debit") debit += line.cents;
    else credit += line.cents;
  }
  return { debit, credit };
}

function cryptoInt(n: number): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] % n;
}

export function shuffle<T>(
  items: readonly T[],
  random: (n: number) => number = cryptoInt,
): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sameLine(a: EntryLine, b: EntryLine): boolean {
  return a.account === b.account && a.side === b.side && a.cents === b.cents;
}

function matchExact(attempt: EntryLine[], solution: EntryLine[]) {
  const usedAttempt = new Set<number>();
  const usedSolution = new Set<number>();
  solution.forEach((expected, e) => {
    const u = attempt.findIndex(
      (line, i) => !usedAttempt.has(i) && sameLine(line, expected),
    );
    if (u !== -1) {
      usedAttempt.add(u);
      usedSolution.add(e);
    }
  });
  return { usedAttempt, usedSolution };
}

export function gradeEntry(
  attempt: EntryLine[],
  solutions: EntryLine[][],
  nameOf: (id: AccountId) => string,
): GradeResult {
  const { debit, credit } = sumSides(attempt);

  let best = 0;
  let bestMatch = matchExact(attempt, solutions[0]);
  for (let i = 0; i < solutions.length; i++) {
    const match = matchExact(attempt, solutions[i]);
    if (
      match.usedSolution.size === solutions[i].length &&
      attempt.length === solutions[i].length
    ) {
      return { correct: true, solutionIndex: i, debit, credit, feedback: [] };
    }
    if (match.usedSolution.size > bestMatch.usedSolution.size) {
      best = i;
      bestMatch = match;
    }
  }

  const solution = solutions[best];
  const head: Feedback[] = [];
  const lineItems: Feedback[] = [];
  const tail: Feedback[] = [];

  if (debit !== credit) {
    head.push({
      kind: "unbalanced",
      message: `Debits total ${formatCents(debit)} and credits total ${formatCents(credit)}, so the entry is out by ${formatCents(Math.abs(debit - credit))}.`,
    });
  }

  const reported = new Set<number>();
  attempt.forEach((line, a) => {
    if (reported.has(a)) return;
    attempt.forEach((other, b) => {
      if (b <= a || reported.has(b)) return;
      if (other.account === line.account && other.side === line.side) {
        reported.add(b);
        head.push({
          kind: "duplicate",
          message: `Lines ${a + 1} and ${b + 1} both ${line.side} ${nameOf(line.account)}. Combine them into one line.`,
        });
      }
    });
  });

  let leftU = attempt
    .map((line, i) => ({ line, i }))
    .filter(({ i }) => !bestMatch.usedAttempt.has(i));
  let leftE = solution.filter((_, i) => !bestMatch.usedSolution.has(i));

  function pairBy(
    test: (u: EntryLine, e: EntryLine) => boolean,
    emit: (u: EntryLine, n: number, e: EntryLine) => Feedback,
  ) {
    const remainingU: typeof leftU = [];
    for (const u of leftU) {
      const e = leftE.findIndex((expected) => test(u.line, expected));
      if (e === -1) {
        remainingU.push(u);
        continue;
      }
      lineItems.push(emit(u.line, u.i + 1, leftE[e]));
      leftE = leftE.filter((_, i) => i !== e);
    }
    leftU = remainingU;
  }

  pairBy(
    (u, e) => u.account === e.account && u.side === e.side,
    (u, n) => ({
      kind: "wrong-amount",
      line: n,
      message: `Line ${n}: ${nameOf(u.account)} is the right account on the right side, but the amount is off.`,
    }),
  );

  pairBy(
    (u, e) => u.account === e.account && u.side !== e.side,
    (u, n, e) => ({
      kind: "wrong-side",
      line: n,
      message: `Line ${n}: ${nameOf(u.account)} belongs in this entry, but on the other side.${u.cents !== e.cents ? " Check the amount too." : ""}`,
    }),
  );

  pairBy(
    (u, e) => u.side === e.side,
    (u, n) => ({
      kind: "wrong-account",
      line: n,
      message: `Line ${n}: ${nameOf(u.account)} isn't the right account for this ${u.side}.`,
    }),
  );

  for (const u of leftU) {
    lineItems.push({
      kind: "extra",
      line: u.i + 1,
      message: `Line ${u.i + 1}: ${nameOf(u.line.account)} doesn't belong in this entry.`,
    });
  }

  for (const side of ["debit", "credit"] as const) {
    const k = leftE.filter((e) => e.side === side).length;
    if (k > 0) {
      tail.push({
        kind: "missing",
        message: `The entry is missing ${k} ${side} ${k > 1 ? "lines" : "line"}.`,
      });
    }
  }

  lineItems.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));

  return {
    correct: false,
    solutionIndex: best,
    debit,
    credit,
    feedback: [...head, ...lineItems, ...tail],
  };
}
