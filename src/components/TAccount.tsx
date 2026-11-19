import type { CSSProperties } from "react";
import Link from "next/link";
import type { Home } from "@/content/home";
import { siteIdentity } from "@/content/site";

// Stagger index read by the T-account animation-delay in globals.css.
function delay(i: number) {
  return { "--i": i } as CSSProperties;
}

export function TAccount({ balance }: { balance: Home["balance"] }) {
  const { accounting, building } = balance;

  return (
    <div className="taccount">
      <h2 className="taccount-label taccount-label--accounting">Accounting</h2>
      <h2 className="taccount-label taccount-label--building">Building</h2>
      <div className="taccount-hr" aria-hidden="true" />
      <ul className="taccount-col taccount-col--accounting">
        {accounting.map((item, i) => (
          <li key={item} className="taccount-item" style={delay(i)}>
            {item}
          </li>
        ))}
      </ul>
      <ul className="taccount-col taccount-col--building">
        {building.map((item, i) => (
          <li
            key={item.label}
            className="taccount-item"
            style={delay(accounting.length + i)}
          >
            {item.href ? (
              <Link href={item.href} className="taccount-item-link">
                {item.label}
              </Link>
            ) : (
              item.label
            )}
          </li>
        ))}
      </ul>
      <div className="taccount-vr" aria-hidden="true" />
      <p className="taccount-total">
        <span className="taccount-total-label">Balance</span>
        <span className="taccount-total-value">= {siteIdentity.name}</span>
      </p>
    </div>
  );
}
