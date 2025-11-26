import { parseAbiItem } from "abitype";
import { createConfig, factory } from "ponder";

import { FactoryP2PAbi } from "./abis/FactoryP2P";
import { TokenP2PAbi } from "./abis/TokenP2P";

const contractDeployedEvent = parseAbiItem(
  "event ContractDeployed(uint indexed contractId, address indexed contractAddress, uint maxSupply, string name, string symbol)"
);

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
      address: "0x33b3332c63fce47a3972d54f9d8b1856e4e31e40",
      startBlock:31300000,
    },
    TokenP2P: {
      chain: "mantleSepolia",
      abi: TokenP2PAbi,
      address: factory({
        address: "0x33b3332c63fce47a3972d54f9d8b1856e4e31e40",
        event: contractDeployedEvent,
        parameter: "contractAddress",
      }),
      startBlock:31300000,
    },
  },
});
