import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type Deployment = {
  address: string;
  abi: unknown;
};

function main() {
  const repoRoot = resolve(__dirname, "..");
  const deploymentPath = resolve(repoRoot, "deployments", "sepolia", "VoteChain.json");
  const outPath = resolve(repoRoot, "frontend", "src", "config", "contracts.ts");

  const raw = readFileSync(deploymentPath, "utf8");
  const deployment = JSON.parse(raw) as Deployment;

  if (!deployment.address || typeof deployment.address !== "string") {
    throw new Error(`Missing "address" in ${deploymentPath}`);
  }
  if (!deployment.abi) {
    throw new Error(`Missing "abi" in ${deploymentPath}`);
  }

  const file = `export const DEFAULT_CONTRACT_ADDRESS = '${deployment.address}';\n\n// ABI copied from deployments/sepolia/VoteChain.json\nexport const VOTECHAIN_ABI = ${JSON.stringify(
    deployment.abi,
    null,
    2,
  )} as const;\n`;

  writeFileSync(outPath, file, "utf8");
  console.log(`Wrote ${outPath}`);
}

main();

