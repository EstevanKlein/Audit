import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@typechain/hardhat";
import "hardhat-deploy";
// import "@fhevm/hardhat-plugin"; // Temporarily disabled for testing

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/";
const ZAMA_DEVNET_RPC_URL = process.env.ZAMA_DEVNET_RPC_URL || "https://devnet.zama.ai";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
    },
  },
  
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
    },
    localfhevm: {
      url: "http://localhost:8545",
      accounts: [PRIVATE_KEY],
      chainId: 8009,
    },
    zamadevnet: {
      url: ZAMA_DEVNET_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 8009,
      gasPrice: 'auto',
      gas: 'auto',
    },
  },
  
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
  
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },

  // fhevm: {
  //   // FHEVM specific configuration
  //   enabled: true,
  //   // Add FHEVM networks
  //   networks: {
  //     zamadevnet: {
  //       gatewayUrl: "https://gateway.devnet.zama.ai",
  //     },
  //     localfhevm: {
  //       gatewayUrl: "http://localhost:7077",
  //     },
  //   },
  // },
};

export default config;