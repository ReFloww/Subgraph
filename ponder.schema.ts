import { onchainTable } from "ponder";

export const transactionLogs = onchainTable("transaction_logs", (t) => ({
  id: t.text().primaryKey(),
  contractAddress: t.hex().notNull(),
  user: t.hex().notNull(),
  type: t.text().notNull(), // "BUY" | "SELL"
  tokenAmount: t.bigint().notNull(),
  usdtAmount: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  logIndex: t.bigint().notNull(),
}));

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
  balance: t.bigint().notNull(),
  lastUpdated: t.bigint().notNull(),
  lastUpdatedBlock: t.bigint().notNull(),
  productId: t.text().notNull(),
}));
