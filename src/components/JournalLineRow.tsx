import {
  ACCOUNTS,
  ACCOUNT_GROUPS,
  type AccountId,
  type Side,
} from "@/content/journal-scenarios";

export type DraftLine = {
  key: number;
  account: AccountId | "";
  side: Side;
  amount: string;
};

type Props = {
  index: number;
  line: DraftLine;
  idBase: string;
  error?: { account?: string; amount?: string };
  canRemove: boolean;
  onChange: (key: number, patch: Partial<Omit<DraftLine, "key">>) => void;
  onRemove: (key: number) => void;
};

export function JournalLineRow({
  index,
  line,
  idBase,
  error,
  canRemove,
  onChange,
  onRemove,
}: Props) {
  const n = index + 1;
  const accountId = `${idBase}-account-${line.key}`;
  const amountId = `${idBase}-amount-${line.key}`;
  const accountErrorId = `${accountId}-error`;
  const amountErrorId = `${amountId}-error`;

  return (
    <li className={`jt-line jt-line--${line.side}`}>
      <div className="jt-line-head">
        <span className="jt-line-title">Line {n}</span>
        <button
          type="button"
          className="jt-remove"
          aria-label={`Remove line ${n}`}
          disabled={!canRemove}
          onClick={() => onRemove(line.key)}
        >
          Remove
        </button>
      </div>

      <div className="jt-field">
        <label className="jt-field-label" htmlFor={accountId}>
          Account
        </label>
        <select
          id={accountId}
          className="jt-select"
          value={line.account}
          aria-invalid={error?.account ? true : undefined}
          aria-describedby={error?.account ? accountErrorId : undefined}
          onChange={(e) =>
            onChange(line.key, { account: e.target.value as AccountId | "" })
          }
        >
          <option value="">Choose an account</option>
          {ACCOUNT_GROUPS.map(({ group, label }) => (
            <optgroup key={group} label={label}>
              {ACCOUNTS.filter((account) => account.group === group).map(
                (account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ),
              )}
            </optgroup>
          ))}
        </select>
        {error?.account && (
          <p className="jt-field-error" id={accountErrorId}>
            {error.account}
          </p>
        )}
      </div>

      <div className="jt-side-amount">
        <fieldset className="jt-side">
          <legend className="sr-only">Side for line {n}</legend>
          {(["debit", "credit"] as const).map((side) => (
            <label
              key={side}
              className={`jt-side-option jt-side-option--${side}`}
            >
              <input
                type="radio"
                className="jt-side-input"
                name={`${idBase}-side-${line.key}`}
                value={side}
                checked={line.side === side}
                onChange={() => onChange(line.key, { side })}
              />
              {side === "debit" ? "Debit" : "Credit"}
            </label>
          ))}
        </fieldset>

        <div className="jt-field">
          <label className="jt-field-label" htmlFor={amountId}>
            Amount
          </label>
          <div className="jt-amount">
            <span className="jt-amount-prefix" aria-hidden="true">
              $
            </span>
            <input
              id={amountId}
              className="jt-input"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              enterKeyHint="done"
              placeholder="0.00"
              value={line.amount}
              aria-invalid={error?.amount ? true : undefined}
              aria-describedby={error?.amount ? amountErrorId : undefined}
              onChange={(e) => onChange(line.key, { amount: e.target.value })}
            />
          </div>
        </div>
      </div>
      {error?.amount && (
        <p className="jt-field-error" id={amountErrorId}>
          {error.amount}
        </p>
      )}
    </li>
  );
}
