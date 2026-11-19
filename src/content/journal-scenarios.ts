export type Side = "debit" | "credit";

export type AccountGroup =
  "asset" | "liability" | "equity" | "revenue" | "expense";

export type Account = {
  id: string;
  name: string;
  group: AccountGroup;
  normal: Side;
};

export type ScenarioKind = "basic" | "adjusting";

export const ACCOUNTS = [
  { id: "cash", name: "Cash", group: "asset", normal: "debit" },
  {
    id: "accounts-receivable",
    name: "Accounts receivable",
    group: "asset",
    normal: "debit",
  },
  {
    id: "allowance-doubtful",
    name: "Allowance for doubtful accounts",
    group: "asset",
    normal: "credit",
  },
  { id: "inventory", name: "Inventory", group: "asset", normal: "debit" },
  { id: "supplies", name: "Supplies", group: "asset", normal: "debit" },
  { id: "prepaid-rent", name: "Prepaid rent", group: "asset", normal: "debit" },
  {
    id: "prepaid-insurance",
    name: "Prepaid insurance",
    group: "asset",
    normal: "debit",
  },
  {
    id: "gst-receivable",
    name: "GST receivable",
    group: "asset",
    normal: "debit",
  },
  { id: "equipment", name: "Equipment", group: "asset", normal: "debit" },
  {
    id: "accumulated-depreciation",
    name: "Accumulated depreciation, equipment",
    group: "asset",
    normal: "credit",
  },
  {
    id: "accounts-payable",
    name: "Accounts payable",
    group: "liability",
    normal: "credit",
  },
  {
    id: "wages-payable",
    name: "Wages payable",
    group: "liability",
    normal: "credit",
  },
  {
    id: "interest-payable",
    name: "Interest payable",
    group: "liability",
    normal: "credit",
  },
  {
    id: "unearned-revenue",
    name: "Unearned revenue",
    group: "liability",
    normal: "credit",
  },
  {
    id: "gst-payable",
    name: "GST payable",
    group: "liability",
    normal: "credit",
  },
  {
    id: "loan-payable",
    name: "Bank loan payable",
    group: "liability",
    normal: "credit",
  },
  {
    id: "common-shares",
    name: "Common shares",
    group: "equity",
    normal: "credit",
  },
  {
    id: "retained-earnings",
    name: "Retained earnings",
    group: "equity",
    normal: "credit",
  },
  {
    id: "dividends",
    name: "Dividends declared",
    group: "equity",
    normal: "debit",
  },
  {
    id: "sales-revenue",
    name: "Sales revenue",
    group: "revenue",
    normal: "credit",
  },
  {
    id: "service-revenue",
    name: "Service revenue",
    group: "revenue",
    normal: "credit",
  },
  {
    id: "cogs",
    name: "Cost of goods sold",
    group: "expense",
    normal: "debit",
  },
  {
    id: "rent-expense",
    name: "Rent expense",
    group: "expense",
    normal: "debit",
  },
  {
    id: "wages-expense",
    name: "Wages expense",
    group: "expense",
    normal: "debit",
  },
  {
    id: "supplies-expense",
    name: "Supplies expense",
    group: "expense",
    normal: "debit",
  },
  {
    id: "insurance-expense",
    name: "Insurance expense",
    group: "expense",
    normal: "debit",
  },
  {
    id: "utilities-expense",
    name: "Utilities expense",
    group: "expense",
    normal: "debit",
  },
  {
    id: "depreciation-expense",
    name: "Depreciation expense",
    group: "expense",
    normal: "debit",
  },
  {
    id: "interest-expense",
    name: "Interest expense",
    group: "expense",
    normal: "debit",
  },
  {
    id: "bad-debt-expense",
    name: "Bad debt expense",
    group: "expense",
    normal: "debit",
  },
] as const satisfies readonly Account[];

export type AccountId = (typeof ACCOUNTS)[number]["id"];

export type EntryLine = { account: AccountId; side: Side; cents: number };

export type Scenario = {
  id: string;
  kind: ScenarioKind;
  topic: string;
  prompt: string;
  lines: EntryLine[];
  alternatives?: EntryLine[][];
  explanation: string;
};

export const ACCOUNT_GROUPS: { group: AccountGroup; label: string }[] = [
  { group: "asset", label: "Assets" },
  { group: "liability", label: "Liabilities" },
  { group: "equity", label: "Equity" },
  { group: "revenue", label: "Revenue" },
  { group: "expense", label: "Expenses" },
];

export function accountName(id: AccountId): string {
  return ACCOUNTS.find((account) => account.id === id)?.name ?? id;
}

export const BUSINESS = {
  name: "Switchback Cycles Ltd.",
  context:
    "You keep the books for Switchback Cycles Ltd., a small bike shop corporation in Burnaby. It uses a perpetual inventory system and has a December 31 year end. Ignore sales tax unless the transaction mentions it.",
};

function dr(account: AccountId, dollars: number): EntryLine {
  return { account, side: "debit", cents: dollars * 100 };
}

function cr(account: AccountId, dollars: number): EntryLine {
  return { account, side: "credit", cents: dollars * 100 };
}

export const SCENARIOS: Scenario[] = [
  {
    id: "owner-investment",
    kind: "basic",
    topic: "Owner investment",
    prompt:
      "The owner deposits $25,000 of her savings into the business bank account in exchange for common shares of Switchback Cycles.",
    lines: [dr("cash", 25000), cr("common-shares", 25000)],
    explanation:
      "Cash, an asset, goes up with a debit. Issuing shares increases shareholders' equity, so Common shares is credited for the amount invested.",
  },
  {
    id: "equipment-cash",
    kind: "basic",
    topic: "Equipment for cash",
    prompt:
      "Buys a professional repair stand and tool kit for $3,600, paid in cash. The tools should last for several years.",
    lines: [dr("equipment", 3600), cr("cash", 3600)],
    explanation:
      "The tools will help earn revenue for years, so they are recorded as Equipment, not expensed. One asset goes up and another goes down by the same amount.",
  },
  {
    id: "equipment-on-account",
    kind: "basic",
    topic: "Equipment on account",
    prompt:
      "Buys a $4,800 wheel-truing machine from a supplier on account, with payment due in 30 days.",
    lines: [dr("equipment", 4800), cr("accounts-payable", 4800)],
    explanation:
      "Equipment is debited at cost. Nothing has been paid yet, so the amount owed is a credit to Accounts payable.",
  },
  {
    id: "inventory-on-account",
    kind: "basic",
    topic: "Inventory on account",
    prompt:
      "Receives 10 commuter bikes from a distributor at $650 each, on account. The shop plans to resell them.",
    lines: [dr("inventory", 6500), cr("accounts-payable", 6500)],
    explanation:
      "Goods bought for resale go to Inventory under a perpetual system: 10 bikes at $650 is $6,500. They were bought on credit, so Accounts payable is credited.",
  },
  {
    id: "cash-sale-cogs",
    kind: "basic",
    topic: "Cash sale with cost of goods sold",
    prompt:
      "Sells one of the commuter bikes to a walk-in customer for $1,100 cash. The bike cost the shop $650.",
    lines: [
      dr("cash", 1100),
      cr("sales-revenue", 1100),
      dr("cogs", 650),
      cr("inventory", 650),
    ],
    explanation:
      "A perpetual system records two things: the sale (debit Cash, credit Sales revenue for $1,100) and its cost (debit Cost of goods sold, credit Inventory for $650). The $450 difference is gross profit.",
  },
  {
    id: "service-on-account",
    kind: "basic",
    topic: "Service on account",
    prompt:
      "Tunes up eight bikes for a local cycling club at $120 each and sends an invoice due in 30 days.",
    lines: [dr("accounts-receivable", 960), cr("service-revenue", 960)],
    explanation:
      "Revenue is recognized when the work is done, not when cash arrives. The club owes $960, so Accounts receivable is debited and Service revenue is credited.",
  },
  {
    id: "collect-receivable",
    kind: "basic",
    topic: "Collecting a receivable",
    prompt: "The cycling club pays its $960 tune-up invoice in full.",
    lines: [dr("cash", 960), cr("accounts-receivable", 960)],
    explanation:
      "The revenue was already recorded when the work was done. This swaps one asset for another: Cash goes up with a debit and Accounts receivable goes down with a credit.",
  },
  {
    id: "pay-payable",
    kind: "basic",
    topic: "Paying a payable",
    prompt: "Pays the distributor the $6,500 owed for the commuter bikes.",
    lines: [dr("accounts-payable", 6500), cr("cash", 6500)],
    explanation:
      "Paying a liability reduces it, so Accounts payable is debited and Cash is credited. There is no expense here; the bikes' cost reaches the income statement through Cost of goods sold when they sell.",
  },
  {
    id: "prepaid-rent",
    kind: "basic",
    topic: "Prepaid rent",
    prompt:
      "On October 1, pays the landlord $7,200 cash for six months of shop rent, October through March.",
    lines: [dr("prepaid-rent", 7200), cr("cash", 7200)],
    explanation:
      "Rent paid in advance is an asset until the months are used, so Prepaid rent is debited. It becomes Rent expense month by month through adjusting entries.",
  },
  {
    id: "unearned-receipt",
    kind: "basic",
    topic: "Unearned revenue",
    prompt:
      "On December 1, a commuter pays $600 cash for a 12-month repair plan covering unlimited tune-ups, starting that day.",
    lines: [dr("cash", 600), cr("unearned-revenue", 600)],
    explanation:
      "The shop has the cash but still owes 12 months of service, so it records a liability, Unearned revenue. Revenue is recognized as each month of service is delivered.",
  },
  {
    id: "bank-loan",
    kind: "basic",
    topic: "Bank loan",
    prompt:
      "Borrows $10,000 from the bank on September 1. The loan charges 6% annual interest, paid later with the principal.",
    lines: [dr("cash", 10000), cr("loan-payable", 10000)],
    explanation:
      "Cash is debited for the money received and Bank loan payable is credited for the obligation. No interest is recorded yet because none has built up on the first day.",
  },
  {
    id: "gst-sale",
    kind: "basic",
    topic: "Sale with GST",
    prompt:
      "Rebuilds a customer's wheel for $240 plus 5% GST ($12). The customer pays $252 by debit card.",
    lines: [dr("cash", 252), cr("service-revenue", 240), cr("gst-payable", 12)],
    explanation:
      "Only the $240 is revenue. The $12 of GST is collected for the Canada Revenue Agency, so it is a liability, GST payable. Debit card payments land in the bank, so Cash is debited $252.",
  },
  {
    id: "dividend",
    kind: "basic",
    topic: "Dividend",
    prompt:
      "The board declares a $1,500 cash dividend and pays it to the shareholder the same day.",
    lines: [dr("dividends", 1500), cr("cash", 1500)],
    alternatives: [[dr("retained-earnings", 1500), cr("cash", 1500)]],
    explanation:
      "A dividend is a distribution of profit to owners, not an expense. Dividends declared is debited (it reduces retained earnings at closing) and Cash is credited. Debiting Retained earnings directly is also accepted.",
  },
  {
    id: "loan-payment",
    kind: "basic",
    topic: "Loan and interest payment",
    prompt:
      "Pays the bank $1,200: $1,000 to reduce the loan principal and $200 of interest that was already recorded as Interest payable at year end.",
    lines: [
      dr("loan-payable", 1000),
      dr("interest-payable", 200),
      cr("cash", 1200),
    ],
    explanation:
      "Both liabilities go down, so Bank loan payable and Interest payable are debited. The interest expense was recognized when it was accrued, so debiting Interest expense again would count it twice.",
  },
  {
    id: "write-off",
    kind: "basic",
    topic: "Writing off a bad debt",
    prompt:
      "A customer who owes $120 for repairs has moved away and can't be reached. Using the allowance method, the shop writes off the account. The allowance has enough balance to cover it.",
    lines: [dr("allowance-doubtful", 120), cr("accounts-receivable", 120)],
    explanation:
      "The expense was already estimated when the allowance was set up, so the write-off uses the allowance: debit Allowance for doubtful accounts, credit Accounts receivable. Net receivables don't change.",
  },
  {
    id: "rent-used",
    kind: "adjusting",
    topic: "Prepaid rent adjustment",
    prompt:
      "December 31 year end. On October 1 the shop paid $7,200 for six months of rent and recorded it as Prepaid rent. Record the rent used so far.",
    lines: [dr("rent-expense", 3600), cr("prepaid-rent", 3600)],
    explanation:
      "October, November and December have passed, which is 3 of 6 months, or $3,600. That portion moves from the asset Prepaid rent to Rent expense.",
  },
  {
    id: "supplies-used",
    kind: "adjusting",
    topic: "Supplies adjustment",
    prompt:
      "December 31. The Supplies account shows $540 of shop supplies bought during the year and recorded as an asset. A count finds $190 still on the shelf.",
    lines: [dr("supplies-expense", 350), cr("supplies", 350)],
    explanation:
      "Supplies used are $540 minus $190, or $350. Debit Supplies expense and credit Supplies so the asset matches what is actually on hand.",
  },
  {
    id: "unearned-earned",
    kind: "adjusting",
    topic: "Earning unearned revenue",
    prompt:
      "December 31. On December 1 a customer paid $600 for a 12-month repair plan, recorded as Unearned revenue. One month of service has now been provided.",
    lines: [dr("unearned-revenue", 50), cr("service-revenue", 50)],
    explanation:
      "One twelfth of $600 is $50 earned. Unearned revenue is reduced with a debit and Service revenue is credited. The other $550 stays a liability.",
  },
  {
    id: "accrued-wages",
    kind: "adjusting",
    topic: "Accrued wages",
    prompt:
      "December 31. The shop's mechanic has worked the last three days of December at $280 a day. Those wages will be paid on the regular payday in January.",
    lines: [dr("wages-expense", 840), cr("wages-payable", 840)],
    explanation:
      "The work happened this year, so the expense belongs to this year: 3 days at $280 is $840. Debit Wages expense and credit Wages payable for the amount owed.",
  },
  {
    id: "depreciation",
    kind: "adjusting",
    topic: "Depreciation",
    prompt:
      "December 31. The shop's equipment cost $8,400, has no residual value and a five-year useful life. Record a full year of straight-line depreciation.",
    lines: [
      dr("depreciation-expense", 1680),
      cr("accumulated-depreciation", 1680),
    ],
    explanation:
      "$8,400 over 5 years is $1,680 a year. Depreciation expense is debited, and the credit goes to Accumulated depreciation, a contra asset, so the original cost stays visible in Equipment.",
  },
  {
    id: "accrued-interest",
    kind: "adjusting",
    topic: "Accrued interest",
    prompt:
      "December 31. The $10,000 bank loan at 6% annual interest has been outstanding for four months. No interest has been paid or recorded yet.",
    lines: [dr("interest-expense", 200), cr("interest-payable", 200)],
    explanation:
      "Four months of interest is $10,000 times 6% times 4/12, or $200. It has been incurred but not paid, so debit Interest expense and credit Interest payable.",
  },
  {
    id: "bad-debt-estimate",
    kind: "adjusting",
    topic: "Bad debt estimate",
    prompt:
      "December 31. Accounts receivable total $9,000 and the shop expects 5% won't be collected. The Allowance for doubtful accounts has a zero balance before this adjustment.",
    lines: [dr("bad-debt-expense", 450), cr("allowance-doubtful", 450)],
    explanation:
      "5% of $9,000 is $450. The allowance method expenses the estimated loss now, matching it to this year's revenue: debit Bad debt expense, credit Allowance for doubtful accounts.",
  },
];
