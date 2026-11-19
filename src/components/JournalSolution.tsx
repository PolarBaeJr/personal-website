import {
  accountName,
  type AccountId,
  type Scenario,
} from "@/content/journal-scenarios";
import { formatCents } from "@/lib/journal-grade";

type Props = {
  scenario: Scenario;
  correct: boolean;
};

export function JournalSolution({ scenario }: Props) {
  const accounts: AccountId[] = [];
  for (const line of scenario.lines) {
    if (!accounts.includes(line.account)) accounts.push(line.account);
  }

  return (
    <div className="jt-solution">
      <table className="jt-journal">
        <caption className="sr-only">Journal entry</caption>
        <thead>
          <tr>
            <th scope="col" className="jt-journal-account">
              Account
            </th>
            <th scope="col" className="jt-journal-amount">
              Debit
            </th>
            <th scope="col" className="jt-journal-amount">
              Credit
            </th>
          </tr>
        </thead>
        <tbody>
          {scenario.lines.map((line) => (
            <tr
              key={`${line.account}-${line.side}`}
              className={
                line.side === "credit" ? "jt-journal-row--credit" : undefined
              }
            >
              <td className="jt-journal-account">
                {accountName(line.account)}
              </td>
              <td className="jt-journal-amount jt-journal-debit">
                {line.side === "debit" ? formatCents(line.cents) : ""}
              </td>
              <td className="jt-journal-amount jt-journal-credit">
                {line.side === "credit" ? formatCents(line.cents) : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        <h3>Posted to the ledger</h3>
        <ul className="jt-ledger">
          {accounts.map((account) => (
            <li key={account} className="jt-t">
              <p className="jt-t-name">{accountName(account)}</p>
              <div className="jt-t-body">
                {(["debit", "credit"] as const).map((side) => {
                  const entries = scenario.lines.filter(
                    (line) => line.account === account && line.side === side,
                  );
                  return (
                    <ul
                      key={side}
                      className={`jt-t-side jt-t-side--${side}`}
                      aria-label={
                        side === "debit" ? "Debit side" : "Credit side"
                      }
                    >
                      {entries.length === 0 ? (
                        <li>
                          <span className="sr-only">None</span>
                        </li>
                      ) : (
                        entries.map((line) => (
                          <li key={line.side} className="jt-t-entry num">
                            {formatCents(line.cents)}
                          </li>
                        ))
                      )}
                    </ul>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="jt-explanation">{scenario.explanation}</p>
    </div>
  );
}
