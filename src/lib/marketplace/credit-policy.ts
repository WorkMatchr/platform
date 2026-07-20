export type CreditBalances = { available: number; reserved: number; spent: number }

export function reserveBalance(balance: CreditBalances, amount: number): CreditBalances | null {
  if (!Number.isSafeInteger(amount) || amount <= 0 || balance.available < amount) return null
  return { available: balance.available - amount, reserved: balance.reserved + amount, spent: balance.spent }
}

export function consumeBalance(balance: CreditBalances, amount: number): CreditBalances | null {
  if (!Number.isSafeInteger(amount) || amount <= 0 || balance.reserved < amount) return null
  return { available: balance.available, reserved: balance.reserved - amount, spent: balance.spent + amount }
}

export function releaseBalance(balance: CreditBalances, amount: number): CreditBalances | null {
  if (!Number.isSafeInteger(amount) || amount <= 0 || balance.reserved < amount) return null
  return { available: balance.available + amount, reserved: balance.reserved - amount, spent: balance.spent }
}
