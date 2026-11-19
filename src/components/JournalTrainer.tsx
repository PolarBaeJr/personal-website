"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import {
  BUSINESS,
  SCENARIOS,
  accountName,
  type AccountId,
  type EntryLine,
  type ScenarioKind,
} from "@/content/journal-scenarios";
import {
  formatCents,
  gradeEntry,
  parseAmount,
  shuffle,
  sumSides,
  type GradeResult,
} from "@/lib/journal-grade";
import { JournalLineRow, type DraftLine } from "./JournalLineRow";
import { JournalSolution } from "./JournalSolution";

type Filter = "all" | ScenarioKind;

type Deck = { ids: string[]; index: number; shuffled: boolean };

type Card = {
  lines: DraftLine[];
  phase: "editing" | "feedback" | "revealed";
  result: GradeResult | null;
  revealedBy: "correct" | "shown" | null;
  showErrors: boolean;
  scored: boolean;
};

const MAX_LINES = 8;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "basic", label: "Basic" },
  { value: "adjusting", label: "Adjusting entries" },
  { value: "all", label: "All" },
];

const AMOUNT_ERRORS = {
  empty: "Enter an amount, like 1,200 or 1200.50.",
  invalid: "Enter an amount, like 1,200 or 1200.50.",
  zero: "Enter an amount above zero.",
};

function freshLines(): DraftLine[] {
  return [
    { key: 1, account: "", side: "debit", amount: "" },
    { key: 2, account: "", side: "credit", amount: "" },
  ];
}

function freshCard(scored: boolean): Card {
  return {
    lines: freshLines(),
    phase: "editing",
    result: null,
    revealedBy: null,
    showErrors: false,
    scored,
  };
}

function idsFor(filter: Filter): string[] {
  return SCENARIOS.filter(
    (scenario) => filter === "all" || scenario.kind === filter,
  ).map((scenario) => scenario.id);
}

export function JournalTrainer() {
  const idBase = useId();
  const [filter, setFilter] = useState<Filter>("all");
  const [deck, setDeck] = useState<Deck>({
    ids: idsFor("all"),
    index: 0,
    shuffled: false,
  });
  const [card, setCard] = useState<Card>(() => freshCard(false));
  const [score, setScore] = useState({ attempted: 0, firstTry: 0 });

  const nextKey = useRef(3);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const tryAgainRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);

  const scenario =
    SCENARIOS.find((item) => item.id === deck.ids[deck.index]) ?? SCENARIOS[0];
  const { lines, phase } = card;
  const parsed = lines.map((line) => parseAmount(line.amount));
  const errors = card.showErrors
    ? lines.map((line, i) => {
        const amount = parsed[i];
        return {
          account: line.account === "" ? "Choose an account." : undefined,
          amount: amount.ok ? undefined : AMOUNT_ERRORS[amount.reason],
        };
      })
    : null;
  const totals = sumSides(
    lines.map((line, i): EntryLine => {
      const amount = parsed[i];
      return {
        account: "cash",
        side: line.side,
        cents: amount.ok ? amount.cents : 0,
      };
    }),
  );
  const balanced = totals.debit === totals.credit && totals.debit > 0;
  const hasErrors =
    card.showErrors &&
    lines.some((line, i) => line.account === "" || !parsed[i].ok);
  const headingId = `${idBase}-prompt`;

  function check(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const firstInvalid = lines.findIndex(
      (line, i) => line.account === "" || !parsed[i].ok,
    );
    if (firstInvalid !== -1) {
      flushSync(() => setCard({ ...card, showErrors: true }));
      const line = lines[firstInvalid];
      const field = line.account === "" ? "account" : "amount";
      document.getElementById(`${idBase}-${field}-${line.key}`)?.focus();
      return;
    }

    const attempt: EntryLine[] = lines.map((line, i) => {
      const amount = parsed[i];
      return {
        account: line.account as AccountId,
        side: line.side,
        cents: amount.ok ? amount.cents : 0,
      };
    });
    const result = gradeEntry(
      attempt,
      [scenario.lines, ...(scenario.alternatives ?? [])],
      accountName,
    );

    flushSync(() => {
      if (!card.scored) {
        setScore({
          attempted: score.attempted + 1,
          firstTry: score.firstTry + (result.correct ? 1 : 0),
        });
      }
      setCard({
        ...card,
        phase: result.correct ? "revealed" : "feedback",
        result,
        revealedBy: result.correct ? "correct" : null,
        showErrors: false,
        scored: true,
      });
    });
    (result.correct ? nextRef : tryAgainRef).current?.focus();
  }

  function showAnswer() {
    flushSync(() => {
      if (!card.scored) {
        setScore({ ...score, attempted: score.attempted + 1 });
      }
      setCard({
        ...card,
        phase: "revealed",
        revealedBy: "shown",
        showErrors: false,
        scored: true,
      });
    });
    nextRef.current?.focus();
  }

  function tryAgain() {
    let firstKey = 1;
    if (phase === "feedback") {
      firstKey = lines[0].key;
      flushSync(() =>
        setCard({
          ...card,
          phase: "editing",
          result: null,
          showErrors: false,
        }),
      );
    } else {
      flushSync(() => setCard(freshCard(true)));
    }
    document.getElementById(`${idBase}-account-${firstKey}`)?.focus();
  }

  function next() {
    let nextDeck: Deck;
    if (!deck.shuffled) {
      nextDeck = {
        ids: [
          ...deck.ids.slice(0, deck.index + 1),
          ...shuffle(deck.ids.slice(deck.index + 1)),
        ],
        index: deck.index + 1,
        shuffled: true,
      };
    } else if (deck.index + 1 < deck.ids.length) {
      nextDeck = { ...deck, index: deck.index + 1 };
    } else {
      const ids = shuffle(idsFor(filter));
      if (ids.length > 1 && ids[0] === deck.ids[deck.index]) {
        [ids[0], ids[1]] = [ids[1], ids[0]];
      }
      nextDeck = { ids, index: 0, shuffled: true };
    }
    flushSync(() => {
      setDeck(nextDeck);
      setCard(freshCard(false));
    });
    headingRef.current?.focus();
  }

  function changeFilter(value: Filter) {
    const ids = shuffle(idsFor(value));
    setFilter(value);
    setDeck({ ids, index: 0, shuffled: true });
    setCard(freshCard(false));
  }

  function addLine() {
    if (lines.length >= MAX_LINES) return;
    const key = nextKey.current++;
    const side = totals.credit < totals.debit ? "credit" : "debit";
    flushSync(() =>
      setCard({
        ...card,
        lines: [...lines, { key, account: "", side, amount: "" }],
      }),
    );
    document.getElementById(`${idBase}-account-${key}`)?.focus();
  }

  function removeLine(key: number) {
    if (lines.length <= 2) return;
    flushSync(() =>
      setCard({ ...card, lines: lines.filter((line) => line.key !== key) }),
    );
    addRef.current?.focus();
  }

  function updateLine(key: number, patch: Partial<Omit<DraftLine, "key">>) {
    setCard({
      ...card,
      lines: lines.map((line) =>
        line.key === key ? { ...line, ...patch } : line,
      ),
    });
  }

  return (
    <div className="jt">
      <div className="jt-toolbar">
        <fieldset className="jt-filter">
          <legend className="jt-filter-legend">Show</legend>
          <div className="jt-filter-options">
            {FILTERS.map((option) => (
              <label key={option.value} className="jt-choice">
                <input
                  type="radio"
                  className="jt-choice-input"
                  name={`${idBase}-filter`}
                  value={option.value}
                  checked={filter === option.value}
                  onChange={() => changeFilter(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="jt-score">
          {score.attempted === 0
            ? "No transactions checked yet"
            : `${score.firstTry} of ${score.attempted} correct on first try`}
        </p>
      </div>

      <p className="jt-context">{BUSINESS.context}</p>

      <section className="jt-card" aria-labelledby={headingId}>
        <p className="jt-card-meta">
          <span>
            Transaction {deck.index + 1} of {deck.ids.length}
          </span>
          {scenario.kind === "basic" ? (
            <span className="pill pill--cobalt">Basic</span>
          ) : (
            <span className="pill pill--teal">Adjusting</span>
          )}
        </p>
        <h2
          id={headingId}
          className="jt-card-prompt"
          tabIndex={-1}
          ref={headingRef}
        >
          {scenario.prompt}
        </h2>
        {phase === "revealed" && (
          <p className="jt-card-topic">{scenario.topic}</p>
        )}
      </section>

      <form
        className="jt-form"
        onSubmit={check}
        noValidate
        aria-label="Your journal entry"
      >
        <fieldset className="jt-fieldset" disabled={phase !== "editing"}>
          <legend className="sr-only">Entry lines</legend>
          <ol className="jt-lines">
            {lines.map((line, i) => (
              <JournalLineRow
                key={line.key}
                index={i}
                line={line}
                idBase={idBase}
                error={errors?.[i]}
                canRemove={lines.length > 2}
                onChange={updateLine}
                onRemove={removeLine}
              />
            ))}
          </ol>
          <button
            type="button"
            className="btn btn--outline jt-btn jt-add"
            ref={addRef}
            disabled={lines.length >= MAX_LINES}
            onClick={addLine}
          >
            Add line
          </button>
        </fieldset>

        <div className={`jt-totals${balanced ? " jt-totals--balanced" : ""}`}>
          <div className="jt-totals-cell jt-totals-cell--debit">
            <span className="jt-totals-label">Total debits</span>
            <span className="jt-totals-value num">
              {formatCents(totals.debit)}
            </span>
          </div>
          <div className="jt-totals-cell jt-totals-cell--credit">
            <span className="jt-totals-label">Total credits</span>
            <span className="jt-totals-value num">
              {formatCents(totals.credit)}
            </span>
          </div>
          <p className="jt-totals-status">
            {totals.debit + totals.credit === 0
              ? "Enter amounts to see totals"
              : balanced
                ? "Balanced"
                : `Out by ${formatCents(Math.abs(totals.debit - totals.credit))}`}
          </p>
        </div>

        <div className="btn-row jt-actions">
          {phase === "editing" && (
            <>
              <button type="submit" className="btn btn--primary jt-btn">
                Check entry
              </button>
              <button
                type="button"
                className="btn btn--outline jt-btn"
                onClick={showAnswer}
              >
                Show answer
              </button>
            </>
          )}
          {phase === "feedback" && (
            <>
              <button
                type="button"
                className="btn btn--primary jt-btn"
                ref={tryAgainRef}
                onClick={tryAgain}
              >
                Try again
              </button>
              <button
                type="button"
                className="btn btn--outline jt-btn"
                onClick={showAnswer}
              >
                Show answer
              </button>
              <button
                type="button"
                className="btn btn--outline jt-btn"
                ref={nextRef}
                onClick={next}
              >
                Next transaction
              </button>
            </>
          )}
          {phase === "revealed" && (
            <>
              <button
                type="button"
                className="btn btn--outline jt-btn"
                ref={tryAgainRef}
                onClick={tryAgain}
              >
                Try again
              </button>
              <button
                type="button"
                className="btn btn--primary jt-btn"
                ref={nextRef}
                onClick={next}
              >
                Next transaction
              </button>
            </>
          )}
        </div>
      </form>

      <div className="jt-result" role="status" aria-live="polite">
        {hasErrors && <p>Fill in an account and an amount on every line.</p>}
        {phase === "feedback" && card.result && (
          <>
            <p className="jt-result-title">Not quite</p>
            <ul className="jt-feedback">
              {card.result.feedback.map((item, i) => (
                <li key={i} className="jt-feedback-item">
                  {item.message}
                </li>
              ))}
            </ul>
          </>
        )}
        {phase === "revealed" && card.revealedBy === "correct" && (
          <p className="jt-result-title jt-result-title--correct">
            Correct. Debits equal credits and every line matches.
          </p>
        )}
        {phase === "revealed" && card.revealedBy === "shown" && (
          <p className="jt-result-title">{"Here's the answer."}</p>
        )}
      </div>

      {phase === "revealed" && (
        <JournalSolution
          scenario={scenario}
          correct={card.revealedBy === "correct"}
        />
      )}
    </div>
  );
}
