import { ponder } from "ponder:registry";
import { productOnchain, transactionLogs, ownership } from "ponder:schema";

ponder.on("FactoryP2P:ContractDeployed", async ({ event, context }) => {
  console.log(
    `Handling ContractDeployed event from FactoryP2P @ ${event.log.address}`
  );

  const contractAddress = event.args.contractAddress;
  const contractId = event.args.contractId;
  const maxSupply = event.args.maxSupply;
  const name = event.args.name;
  const symbol = event.args.symbol

  await context.db.insert(productOnchain).values({
    id: contractAddress.toLowerCase(),
    sequenceId: contractId,
    contractAddress: contractAddress,
    name: name,
    factoryAddress: event.log.address,
    createdAt: event.block.timestamp,
    createdAtBlock: event.block.number,
    createdAtTransaction: event.transaction.hash,
    holderCount: 0n,
    maxSupply: maxSupply,
    totalSupply: 0n,
    symbol: symbol,
  });
});

ponder.on("TokenP2P:BuyToken", async ({ event, context }) => {
  console.log(
    `Handling BuyToken event from TokenP2P @ ${event.log.address}`
  );

  const contractAddress = event.log.address;
  const transferTo = event.args.transferTo;
  const amount = event.args.amount;

  const usdtAmount = amount;

  await context.db.insert(transactionLogs).values({
    id: `${event.transaction.hash.toLowerCase()}-${event.log.logIndex}`,
    contractAddress: contractAddress as `0x${string}`,
    user: transferTo as `0x${string}`,
    type: "BUY",
    tokenAmount: amount,
    usdtAmount: usdtAmount,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash as `0x${string}`,
    logIndex: BigInt(event.log.logIndex),
  });

  await updateOwnership(
    context,
    contractAddress,
    transferTo,
    amount,
    event.block.timestamp,
    event.block.number
  );

  await updateProductTotalSupply(context, contractAddress, amount, true);
});

ponder.on("TokenP2P:SellToken", async ({ event, context }) => {
  console.log(
    `Handling SellToken event from TokenP2P @ ${event.log.address}`
  );

  const contractAddress = event.log.address;
  const transferFrom = event.args.transferFrom;
  const amount = event.args.amount;
  
  const usdtAmount = amount;

  await context.db.insert(transactionLogs).values({
    id: `${event.transaction.hash.toLowerCase()}-${event.log.logIndex}`,
    contractAddress: contractAddress as `0x${string}`,
    user: transferFrom as `0x${string}`,
    type: "SELL",
    tokenAmount: amount,
    usdtAmount: usdtAmount,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash as `0x${string}`,
    logIndex: BigInt(event.log.logIndex),
  });

  await updateOwnership(
    context,
    contractAddress,
    transferFrom,
    amount,
    event.block.timestamp,
    event.block.number,
    false
  );

  await updateProductTotalSupply(context, contractAddress, amount, false);
});

async function updateOwnership(
  context: any,
  contractAddress: `0x${string}`,
  user: `0x${string}`,
  tokenAmount: bigint,
  timestamp: bigint,
  blockNumber: bigint,
  isBuy: boolean = true
) {
  const ownershipId = `${contractAddress.toLowerCase()}-${user.toLowerCase()}`;
  const productId = contractAddress.toLowerCase();

  try {
    const existingOwnership = await context.db.find(ownership, {
      id: ownershipId,
    });

    if (!existingOwnership) {
      if (isBuy && tokenAmount > 0n) {
        await context.db.insert(ownership).values({
          id: ownershipId,
          contractAddress: contractAddress as `0x${string}`,
          user: user as `0x${string}`,
          balance: tokenAmount,
          lastUpdated: timestamp,
          lastUpdatedBlock: blockNumber,
          productId: contractAddress.toLowerCase(),
        });
        
        await incrementHolderCount(context, productId);
      } else {
        console.error(
          `Cannot create ownership for sell operation or zero amount: ${ownershipId}`
        );
      }
    } else {
      const newBalance = isBuy
        ? existingOwnership.balance + tokenAmount
        : existingOwnership.balance - tokenAmount;

      if (newBalance > 0n) {
        await context.db.update(ownership, { id: ownershipId }).set({
          balance: newBalance,
          lastUpdated: timestamp,
          lastUpdatedBlock: blockNumber,
        });
      } else if (newBalance === 0n) {
        await context.db.delete(ownership, { id: ownershipId });
        
        await decrementHolderCount(context, productId);
      } else {
        console.error(
          `Negative balance detected for ${ownershipId}: ${newBalance}`
        );
      }
    }
  } catch (error) {
    console.error(`Error updating ownership for ${ownershipId}:`, error);
    throw error;
  }
}

async function updateProductTotalSupply(
  context: any,
  contractAddress: `0x${string}`,
  tokenAmount: bigint,
  isIncrease: boolean
) {
  const productId = contractAddress.toLowerCase();

  try {
    const product = await context.db.find(productOnchain, {
      id: productId,
    });

    if (product) {
      const newTotalSupply = isIncrease
        ? product.totalSupply + tokenAmount
        : product.totalSupply - tokenAmount;

      if (newTotalSupply >= 0n) {
        await context.db.update(productOnchain, { id: productId }).set({
          totalSupply: newTotalSupply,
        });
      } else {
        console.error(
          `Negative total supply detected for ${productId}: ${newTotalSupply}`
        );
      }
    } else {
      console.error(`Product not found: ${productId}`);
    }
  } catch (error) {
    console.error(`Error updating total supply for ${productId}:`, error);
    throw error;
  }
}

async function incrementHolderCount(
  context: any,
  productId: string
) {
  try {
    const product = await context.db.find(productOnchain, {
      id: productId,
    });

    if (product) {
      await context.db.update(productOnchain, { id: productId }).set({
        holderCount: product.holderCount + 1n,
      });
    }
  } catch (error) {
    console.error(`Error incrementing holder count for ${productId}:`, error);
  }
}

async function decrementHolderCount(
  context: any,
  productId: string
) {
  try {
    const product = await context.db.find(productOnchain, {
      id: productId,
    });

    if (product && product.holderCount > 0n) {
      await context.db.update(productOnchain, { id: productId }).set({
        holderCount: product.holderCount - 1n,
      });
    }
  } catch (error) {
    console.error(`Error decrementing holder count for ${productId}:`, error);
  }
}