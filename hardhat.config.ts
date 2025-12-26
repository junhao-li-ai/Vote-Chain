import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import type { HardhatUserConfig } from "hardhat/config";
import "solidity-coverage";

import "./tasks/accounts";
import "./tasks/VoteChain";

import * as dotenv from "dotenv";
dotenv.config();

const INFURA_API_KEY: string = process.env.INFURA_API_KEY ?? "";
const PRIVATE_KEY: string = process.env.PRIVATE_KEY ?? "";

const HARDHAT_TEST_ACCOUNTS: { privateKey: string; balance: string }[] = [
  {
    privateKey: "0x59c6995e998f97a5a0044966f094538e5d6f8d4e6b5c5ff1cd3f1f0a1b2c3d4e",
    balance: "10000000000000000000000",
  },
  { privateKey: "0x8b3a350cf5c34c9194ca156b6069c3a724e7c3f1b5b7f3e7d3c6e5a1b2c3d4e5", balance: "10000000000000000000000" },
  { privateKey: "0x0f4b1a0d8c1f0b4a3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c", balance: "10000000000000000000000" },
  { privateKey: "0x1c0b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b", balance: "10000000000000000000000" },
  { privateKey: "0x2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e", balance: "10000000000000000000000" },
  { privateKey: "0x3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f", balance: "10000000000000000000000" },
  { privateKey: "0x4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a", balance: "10000000000000000000000" },
  { privateKey: "0x5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b", balance: "10000000000000000000000" },
  { privateKey: "0x6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c", balance: "10000000000000000000000" },
  { privateKey: "0x7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d", balance: "10000000000000000000000" },
];

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: 0,
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY ?? "",
    },
  },
  gasReporter: {
    currency: "USD",
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: [],
  },
  networks: {
    hardhat: {
      chainId: 31337,
      accounts: HARDHAT_TEST_ACCOUNTS,
    },
    localhost: { chainId: 31337, url: "http://127.0.0.1:8545", accounts: HARDHAT_TEST_ACCOUNTS.map((a) => a.privateKey) },
    sepolia: {
      chainId: 11155111,
      url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    version: "0.8.27",
    settings: {
      metadata: {
        // Not including the metadata hash
        // https://github.com/paulrberg/hardhat-template/issues/31
        bytecodeHash: "none",
      },
      // Disable the optimizer when debugging
      // https://hardhat.org/hardhat-network/#solidity-optimizer-support
      optimizer: {
        enabled: true,
        runs: 800,
      },
      evmVersion: "cancun",
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
};

export default config;
