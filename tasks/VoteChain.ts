import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";

task("votechain:address", "Prints the VoteChain address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;
  const deployment = await deployments.get("VoteChain");
  console.log("VoteChain address is " + deployment.address);
});

task("votechain:create", "Creates a new poll")
  .addParam("name", "Poll name")
  .addParam("options", "Comma-separated options (2-4)")
  .addParam("start", "Start time (unix seconds)")
  .addParam("end", "End time (unix seconds)")
  .addOptionalParam("address", "Optionally specify the VoteChain contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers: hardhatEthers, deployments } = hre;

    const voteChainDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("VoteChain");

    const options = (taskArguments.options as string)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (options.length < 2 || options.length > 4) {
      throw new Error(`--options must contain 2-4 comma-separated values`);
    }

    const start = BigInt(taskArguments.start);
    const end = BigInt(taskArguments.end);
    if (end <= start) {
      throw new Error(`--end must be greater than --start`);
    }

    const [signer] = await hardhatEthers.getSigners();
    const contract = await hardhatEthers.getContractAt("VoteChain", voteChainDeployment.address, signer);

    const tx = await contract.createPoll(taskArguments.name, options, start, end);
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("votechain:vote", "Casts an encrypted vote")
  .addParam("poll", "Poll id")
  .addParam("option", "Option index (0-3)")
  .addOptionalParam("address", "Optionally specify the VoteChain contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers: hardhatEthers, deployments, fhevm } = hre;

    const pollId = BigInt(taskArguments.poll);
    const optionIndex = Number.parseInt(taskArguments.option, 10);
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex > 3) {
      throw new Error(`--option must be an integer between 0 and 3`);
    }

    await fhevm.initializeCLIApi();

    const voteChainDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("VoteChain");

    const [signer] = await hardhatEthers.getSigners();
    const contract = await hardhatEthers.getContractAt("VoteChain", voteChainDeployment.address, signer);

    const encrypted = await fhevm.createEncryptedInput(voteChainDeployment.address, signer.address).add8(optionIndex).encrypt();

    const tx = await contract.vote(pollId, encrypted.handles[0], encrypted.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("votechain:end", "Ends a poll and makes tallies publicly decryptable")
  .addParam("poll", "Poll id")
  .addOptionalParam("address", "Optionally specify the VoteChain contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers: hardhatEthers, deployments } = hre;

    const pollId = BigInt(taskArguments.poll);

    const voteChainDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("VoteChain");

    const [signer] = await hardhatEthers.getSigners();
    const contract = await hardhatEthers.getContractAt("VoteChain", voteChainDeployment.address, signer);

    const tx = await contract.endPoll(pollId);
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("votechain:publish", "Decrypts (public) and posts results on-chain (Sepolia only)")
  .addParam("poll", "Poll id")
  .addOptionalParam("address", "Optionally specify the VoteChain contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers: hardhatEthers, deployments } = hre;

    const pollId = BigInt(taskArguments.poll);

    const voteChainDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("VoteChain");

    const contract = await hardhatEthers.getContractAt("VoteChain", voteChainDeployment.address);
    const meta = await contract.getPollMeta(pollId);
    const optionsCount = Number(meta[1]);

    const handles: string[] = [];
    for (let i = 0; i < optionsCount; i++) {
      const h = await contract.getEncryptedTally(pollId, i);
      handles.push(h);
    }

    const instance = await createInstance(SepoliaConfig);
    const decrypted = await instance.publicDecrypt(handles);

    const cleartexts = decrypted.abiEncodedClearValues;
    const proof = decrypted.decryptionProof;

    console.log("clearValues:", decrypted.clearValues);
    console.log("abiEncodedClearValues:", cleartexts);
    console.log("decryptionProof:", proof);

    const [signer] = await hardhatEthers.getSigners();
    const writeContract = await hardhatEthers.getContractAt("VoteChain", voteChainDeployment.address, signer);
    const tx = await writeContract.publishResults(pollId, cleartexts, proof);
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });
