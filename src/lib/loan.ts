export interface LoanResult {
  principal: number;
  monthly: number;
  totalInterest: number;
  totalRepayment: number;
}

/** Standard annuity loan: equal monthly payments. */
export function calculateLoan(price: number, down: number, annualRatePct: number, months: number): LoanResult {
  const principal = Math.max(0, price - down);
  const n = Math.max(1, Math.round(months));
  const r = annualRatePct / 100 / 12;
  const monthly = r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n));
  const totalRepayment = monthly * n;
  return { principal, monthly, totalInterest: totalRepayment - principal, totalRepayment };
}
