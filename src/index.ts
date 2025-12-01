import { ponder } from "ponder:registry";
import {
  productOnchain,
  transactionLogs,
  ownership,
  managerOnchain,
  managerAllocation,
} from "ponder:schema";

ponder.on("FactoryP2P:ContractDeployed", async ({ event, context }) => {
  console.log(
    `[FactoryP2P] New Product: ${event.args.name} @ ${event.args.contractAddress}`
  );

  await context.db.insert(productOnchain).values({
    id: event.args.contractAddress.toLowerCase(),
    sequenceId: event.args.contractId,
    contractAddress: event.args.contractAddress,
    name: event.args.name,
    symbol: event.args.symbol,
    factoryAddress: event.log.address,
    createdAt: event.block.timestamp,
    createdAtBlock: event.block.number,
    createdAtTransaction: event.transaction.hash,
    holderCount: 0n,
    maxSupply: event.args.maxSupply,
    totalSupply: 0n,
  });
});

ponder.on("TokenP2P:BuyToken", async ({ event, context }) => {
  const contractAddress = event.log.address;
  const transferTo = event.args.transferTo;
  const amount = event.args.amount;
  const usdtAmount = amount;

  await context.db.insert(transactionLogs).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: contractAddress,
    user: transferTo,
    type: "BUY",
    amountIn: usdtAmount,
    amountOut: amount,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
    logIndex: BigInt(event.log.logIndex),
  });

  await updateOwnership(
    context,
    contractAddress,
    transferTo,
    "P2P_TOKEN",
    amount,
    event.block.timestamp,
    event.block.number,
    true
  );
  await updateProductTotalSupply(context, contractAddress, amount, true);
});

ponder.on("TokenP2P:SellToken", async ({ event, context }) => {
  const contractAddress = event.log.address;
  const transferFrom = event.args.transferFrom;
  const amount = event.args.amount;
  const usdtAmount = amount;

  await context.db.insert(transactionLogs).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: contractAddress,
    user: transferFrom,
    type: "SELL",
    amountIn: amount,
    amountOut: usdtAmount,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
    logIndex: BigInt(event.log.logIndex),
  });

  await updateOwnership(
    context,
    contractAddress,
    transferFrom,
    "P2P_TOKEN",
    amount,
    event.block.timestamp,
    event.block.number,
    false
  );
  await updateProductTotalSupply(context, contractAddress, amount, false);
});

ponder.on("FactoryManager:ManagerCreated", async ({ event, context }) => {
  console.log(
    `[FactoryManager] New Manager #${event.args.managerId}: ${event.args.name} @ ${event.args.managerAddress}`
  );

  await context.db.insert(managerOnchain).values({
    id: event.args.managerAddress.toLowerCase(),
    sequenceId: event.args.managerId,
    contractAddress: event.args.managerAddress,
    name: event.args.name,
    owner: event.args.owner,
    createdAt: event.block.timestamp,
    createdAtBlock: event.block.number,
    totalFundsManaged: 0n,
  });
});

ponder.on("ManagerInvestment:Deposit", async ({ event, context }) => {
  console.log(`[Manager] Deposit by ${event.args.user} @ ${event.log.address}`);

  await context.db.insert(transactionLogs).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    user: event.args.user,
    type: "DEPOSIT_FUND",
    amountIn: event.args.amount,
    amountOut: 0n,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
    logIndex: BigInt(event.log.logIndex),
  });

  await updateTotalManagedFunds(
    context,
    event.log.address,
    event.args.amount,
    true
  );

  await updateOwnership(
    context,
    event.log.address,
    event.args.user,
    "FUND",
    event.args.amount,
    event.block.timestamp,
    event.block.number,
    true
  );
});

ponder.on("ManagerInvestment:Withdraw", async ({ event, context }) => {
  console.log(
    `[Manager] Withdraw by ${event.args.user} @ ${event.log.address}`
  );

  await context.db.insert(transactionLogs).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.log.address,
    user: event.args.user,
    type: "WITHDRAW_FUND",
    amountIn: 0n,
    amountOut: event.args.amount, // USDT Keluar
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
    logIndex: BigInt(event.log.logIndex),
  });

  await updateTotalManagedFunds(
    context,
    event.log.address,
    event.args.amount,
    false
  );

  await updateOwnership(
    context,
    event.log.address,
    event.args.user,
    "FUND",
    event.args.amount,
    event.block.timestamp,
    event.block.number,
    false
  );
});

ponder.on("ManagerInvestment:Invested", async ({ event, context }) => {
  const managerAddr = event.log.address;
  const projectAddr = event.args.projectToken;
  const tokenReceived = event.args.amountTokenReceived;

  const allocationId = `${managerAddr.toLowerCase()}-${projectAddr.toLowerCase()}`;

  const existingAlloc = await context.db.find(managerAllocation, {
    id: allocationId,
  });

  if (!existingAlloc) {
    await context.db.insert(managerAllocation).values({
      id: allocationId,
      managerAddress: managerAddr,
      projectTokenAddress: projectAddr,
      tokenBalance: tokenReceived,
      lastUpdated: event.block.timestamp,
    });
  } else {
    await context.db.update(managerAllocation, { id: allocationId }).set({
      tokenBalance: existingAlloc.tokenBalance + tokenReceived,
      lastUpdated: event.block.timestamp,
    });
  }
});

ponder.on("ManagerInvestment:Divested", async ({ event, context }) => {
  const managerAddr = event.log.address;
  const projectAddr = event.args.projectToken;
  const tokenSold = event.args.amountTokenSold;

  const allocationId = `${managerAddr.toLowerCase()}-${projectAddr.toLowerCase()}`;
  const currentAlloc = await context.db.find(managerAllocation, {
    id: allocationId,
  });

  if (currentAlloc) {
    const newBal = currentAlloc.tokenBalance - tokenSold;
    await context.db.update(managerAllocation, { id: allocationId }).set({
      tokenBalance: newBal > 0n ? newBal : 0n,
      lastUpdated: event.block.timestamp,
    });
  }
});

ponder.on("SwapRouter:Swapped", async ({ event, context }) => {
  console.log(`[Swap] User ${event.args.user} swapped tokens`);

  await context.db.insert(transactionLogs).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    contractAddress: event.args.fromToken,
    relatedAddress: event.args.toToken,
    user: event.args.user,
    type: "SWAP",
    amountIn: event.args.amountIn,
    amountOut: event.args.amountOut,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
    logIndex: BigInt(event.log.logIndex),
  });
});

async function updateTotalManagedFunds(
  context: any,
  managerAddr: string,
  amount: bigint,
  isDeposit: boolean
) {
  const id = managerAddr.toLowerCase();
  const manager = await context.db.find(managerOnchain, { id });

  if (manager) {
    const newTotal = isDeposit
      ? manager.totalFundsManaged + amount
      : manager.totalFundsManaged - amount;
    await context.db.update(managerOnchain, { id }).set({
      totalFundsManaged: newTotal >= 0n ? newTotal : 0n,
    });
  }
}

async function updateOwnership(
  context: any,
  contractAddress: string,
  user: string,
  assetType: "P2P_TOKEN" | "FUND",
  tokenAmount: bigint,
  timestamp: bigint,
  blockNumber: bigint,
  isIncrease: boolean = true
) {
  const ownershipId = `${contractAddress.toLowerCase()}-${user.toLowerCase()}`;
  const productId = contractAddress.toLowerCase();

  const existingOwnership = await context.db.find(ownership, {
    id: ownershipId,
  });

  if (!existingOwnership) {
    if (isIncrease && tokenAmount > 0n) {
      await context.db.insert(ownership).values({
        id: ownershipId,
        contractAddress: contractAddress,
        user: user,
        type: assetType,
        balance: tokenAmount,
        lastUpdated: timestamp,
        lastUpdatedBlock: blockNumber,
        productId: productId,
      });

      if (assetType === "P2P_TOKEN") {
        await incrementHolderCount(context, productId);
      }
    }
  } else {
    const newBalance = isIncrease
      ? existingOwnership.balance + tokenAmount
      : existingOwnership.balance - tokenAmount;

    if (newBalance > 0n) {
      await context.db.update(ownership, { id: ownershipId }).set({
        balance: newBalance,
        lastUpdated: timestamp,
        lastUpdatedBlock: blockNumber,
      });
    } else {
      await context.db.delete(ownership, { id: ownershipId });

      if (assetType === "P2P_TOKEN") {
        await decrementHolderCount(context, productId);
      }
    }
  }
}

async function updateProductTotalSupply(
  context: any,
  contractAddress: string,
  tokenAmount: bigint,
  isIncrease: boolean
) {
  const productId = contractAddress.toLowerCase();
  const product = await context.db.find(productOnchain, { id: productId });

  if (product) {
    const newTotalSupply = isIncrease
      ? product.totalSupply + tokenAmount
      : product.totalSupply - tokenAmount;
    await context.db
      .update(productOnchain, { id: productId })
      .set({ totalSupply: newTotalSupply });
  }
}

async function incrementHolderCount(context: any, productId: string) {
  const product = await context.db.find(productOnchain, { id: productId });
  if (product) {
    await context.db
      .update(productOnchain, { id: productId })
      .set({ holderCount: product.holderCount + 1n });
  }
}

async function decrementHolderCount(context: any, productId: string) {
  const product = await context.db.find(productOnchain, { id: productId });
  if (product && product.holderCount > 0n) {
    await context.db
      .update(productOnchain, { id: productId })
      .set({ holderCount: product.holderCount - 1n });
  }
}
