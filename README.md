# Vote-Chain

Vote-Chain is a privacy-preserving voting dApp built on Zama FHEVM. It enables anyone to create a vote, cast encrypted
ballots, and publish verifiable results on-chain only after the voting window has closed.

## Overview

Traditional on-chain voting leaks partial results in real time, which can influence voters and enable coercion. Vote-Chain
keeps ballots and tallies confidential until the vote ends, then makes results publicly decryptable and verifiable. The
workflow is permissionless: any user can create polls, vote, end polls, and submit the final, verified tally to the chain.

## Problem It Solves

- Prevents early-result leakage that can distort voter behavior.
- Protects voter privacy while preserving verifiability.
- Eliminates trusted off-chain tallying by relying on FHE and on-chain verification.
- Supports transparent auditability of poll metadata, timing, and final results.

## End-to-End Flow

1. Create a poll with a name, 2-4 options, and a start/end time.
2. Voters submit encrypted ballots using Zama FHEVM tooling.
3. Encrypted tallies accumulate per option; no one can decrypt before the poll ends.
4. After the end time, any user can finalize the poll to allow public decryption.
5. Decrypted results are submitted on-chain with proof verification.
6. Results become publicly readable from the contract state.

## Key Features

- Poll creation with strict constraints (2-4 options, valid time range).
- Encrypted voting and encrypted per-option tallies.
- Permissionless poll finalization after the end time.
- On-chain publishing of decrypted results with verification.
- Frontend that uses viem for reads and ethers for writes.

## Advantages

- Confidentiality until the vote ends, with verifiable final outcomes.
- Transparent and auditable process backed by smart contracts.
- Reduced trust assumptions by using Zama FHE and on-chain proofs.
- Simple UX for both creators and voters with a clear lifecycle.

## Tech Stack

- Smart contracts: Solidity + Zama FHEVM libraries
- Contract framework: Hardhat (TypeScript)
- Frontend: React + Vite
- Web3: viem (read), ethers (write), RainbowKit for wallet UX
- Package manager: npm

## Architecture and Repository Layout

```
Vote-Chain/
├── contracts/            # Solidity contracts
│   ├── VoteChain.sol     # Core confidential voting contract
│   └── FHECounter.sol    # Example FHE counter contract
├── deploy/               # Deployment scripts
├── tasks/                # Hardhat tasks
├── test/                 # Test suites
├── docs/                 # Zama/FHEVM docs for reference
├── frontend/             # React/Vite web app
├── hardhat.config.ts     # Hardhat configuration
└── README.md
```

## Smart Contract Notes

- `VoteChain.sol` handles poll creation, encrypted voting, and result publishing.
- View functions are designed for public reads without relying on caller context.
- Encrypted tallies remain unreadable until the poll is ended and decryption is verified.

## Frontend Notes

- The frontend is standalone and does not import from the repository root.
- Contract reads use viem; contract writes use ethers.
- Contract configuration lives in `frontend/src/config/contracts.ts`.
- ABI must be copied from the generated deployment artifacts in `deployments/sepolia`.
- The frontend avoids environment variables; configuration is in code.

## Local Setup

### Prerequisites

- Node.js 20+
- npm
- An RPC provider key for Sepolia (for deployment and read/write access)
- A private key for deployment (no mnemonic support)

### Install Dependencies

```bash
npm install
cd frontend
npm install
```

### Compile and Test Contracts

```bash
npm run compile
npm run test
```

### Run a Local Hardhat Node (optional for contract dev)

```bash
npx hardhat node
npx hardhat deploy --network localhost
```

### Deploy to Sepolia

Create a `.env` file in the repository root:

```bash
INFURA_API_KEY=your_infura_key
PRIVATE_KEY=0xYourPrivateKey
ETHERSCAN_API_KEY=optional_for_verification
```

Then deploy:

```bash
npx hardhat deploy --network sepolia
```

### Update Frontend Contract Config

1. Copy the deployed contract address into `frontend/src/config/contracts.ts`.
2. Copy the ABI from `deployments/sepolia` into the `VOTECHAIN_ABI` export in
   `frontend/src/config/contracts.ts`.
3. Run the frontend:

```bash
cd frontend
npm run dev
```

## What Makes It Different

- No plaintext ballots or tallies are exposed during the voting window.
- Results are only published after a verifiable decryption step.
- The whole lifecycle is on-chain, enabling transparent audit trails.

## Future Roadmap

- Gas and calldata optimizations for large voter counts.
- Multi-poll dashboards with richer analytics after decryption.
- Optional allowlists and delegated voting modes.
- L2 deployments to reduce transaction costs.
- Improved indexing and historical data export.
- Deeper wallet UX improvements and mobile-first layouts.

## License

This project is licensed under the BSD-3-Clause-Clear License. See `LICENSE`.
