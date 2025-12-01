import { onchainTable } from "ponder";

// 1. Transaction Logs (Updated untuk support Swap & Manager)
export const transactionLogs = onchainTable("transaction_logs", (t) => ({
  id: t.text().primaryKey(),
  contractAddress: t.hex().notNull(), // Alamat TokenP2P / Manager / Router
  relatedAddress: t.hex(), // Alamat Token lawan (misal: Swap ke Token B)
  user: t.hex().notNull(),
  type: t.text().notNull(), // "BUY", "SELL", "SWAP", "DEPOSIT_FUND", "WITHDRAW_FUND"
  amountIn: t.bigint().notNull(),
  amountOut: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  logIndex: t.bigint().notNull(),
}));

// 2. Product (Token P2P)
export const productOnchain = onchainTable("product_onchain", (t) => ({
  id: t.text().primaryKey(),
  sequenceId: t.bigint().notNull(),
  contractAddress: t.hex().notNull(),
  name: t.text().notNull(),
  symbol: t.text().notNull(),
  maxSupply: t.bigint().notNull(),
  totalSupply: t.bigint().notNull(),
  factoryAddress: t.hex().notNull(),
  createdAt: t.bigint().notNull(),
  createdAtBlock: t.bigint().notNull(),
  createdAtTransaction: t.hex().notNull(),
  holderCount: t.bigint().notNull(),
}));

export const ownership = onchainTable("ownership", (t) => ({
  id: t.text().primaryKey(),
  contractAddress: t.hex().notNull(),
  user: t.hex().notNull(),
  type: t.text().notNull(), //(P2P_TOKEN / LEND)
  balance: t.bigint().notNull(),
  lastUpdated: t.bigint().notNull(),
  lastUpdatedBlock: t.bigint().notNull(),
  productId: t.text().notNull(),
}));

export const managerOnchain = onchainTable("manager_onchain", (t) => ({
  id: t.text().primaryKey(),
  sequenceId: t.bigint().notNull(),
  contractAddress: t.hex().notNull(),
  name: t.text().notNull(),
  owner: t.hex().notNull(),
  createdAt: t.bigint().notNull(),
  createdAtBlock: t.bigint().notNull(),
  totalFundsManaged: t.bigint().notNull(), 
}));

export const managerAllocation = onchainTable("manager_allocation", (t) => ({
  id: t.text().primaryKey(),
  managerAddress: t.hex().notNull(),
  projectTokenAddress: t.hex().notNull(), // Invest kemana?
  tokenBalance: t.bigint().notNull(), // Berapa token proyek yang dipegang
  lastUpdated: t.bigint().notNull(),
}));