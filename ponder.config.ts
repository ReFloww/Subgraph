import { parseAbiItem } from "abitype";
import { createConfig, factory } from "ponder";

import { FactoryP2PAbi } from "./abis/FactoryP2P";
import { TokenP2PAbi } from "./abis/TokenP2P";
import { FactoryManager } from "./abis/FactoryManager";
import { ManagerInvestment } from "./abis/ManagerInvestment";
import { SwapRouter } from "./abis/SwapRouter";

const contractDeployedEvent = parseAbiItem(
  "event ContractDeployed(uint indexed contractId, address indexed contractAddress, uint maxSupply, string name, string symbol)"
);

const managerCreatedEvent = parseAbiItem(
  "event ManagerCreated(address indexed managerAddress, uint256 indexed managerId, address indexed owner, string name)"
);

const START_BLOCK = 31300000

export default createConfig({
  chains: {
    mantleSepolia: {
      id: 5003,
      rpc: process.env.PONDER_RPC_URL_5003,
      maxRequestsPerSecond: 10
    },
  },
  contracts: {
    FactoryP2P: {
      chain: "mantleSepolia",
      abi: FactoryP2PAbi,
      address: "0xa411df45e20d266500363c76ecbf0b8e483fd408",
      startBlock:START_BLOCK,
    },
    TokenP2P: {
      chain: "mantleSepolia",
      abi: TokenP2PAbi,
      address: factory({
        address: "0xa411df45e20d266500363c76ecbf0b8e483fd408",
        event: contractDeployedEvent,
        parameter: "contractAddress",
      }),
      startBlock:START_BLOCK,
    },
    FactoryManager: {
      chain: "mantleSepolia",
      abi: FactoryManager,
      address: "0x4d1a3d97109b2fb7e81023cf0a97aea4277d7235",
      startBlock:START_BLOCK
    },
    ManagerInvestment: {
      chain: "mantleSepolia",
      abi: ManagerInvestment,
      address: factory({
        address: "0x4d1a3d97109b2fb7e81023cf0a97aea4277d7235",
        event: managerCreatedEvent,
        parameter: "managerAddress"
      }),
      startBlock:START_BLOCK
    },
    SwapRouter: {
      chain: "mantleSepolia",
      abi: SwapRouter,
      address: "0x6c83fab8Bf840F62F810c51B9eB986a75411a950",
      startBlock:START_BLOCK
    }
  },
});
