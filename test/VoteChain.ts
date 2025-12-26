import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import type { VoteChain, VoteChain__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("VoteChain")) as VoteChain__factory;
  const voteChain = (await factory.deploy()) as VoteChain;
  return { voteChain, voteChainAddress: await voteChain.getAddress() };
}

describe("VoteChain", function () {
  let signers: Signers;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  it("creates, votes, ends, decrypts, and posts results", async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    const { voteChain, voteChainAddress } = await deployFixture();

    const now = await time.latest();
    const startTime = BigInt(now - 10);
    const endTime = BigInt(now + 100);
    const options = ["Option A", "Option B", "Option C"];

    const createTx = await voteChain.connect(signers.deployer).createPoll("Test Poll", options, startTime, endTime);
    await createTx.wait();

    const pollId = 0n;
    const meta = await voteChain.getPollMeta(pollId);
    expect(meta[0]).to.eq("Test Poll");
    expect(Number(meta[1])).to.eq(3);

    const encryptedVoteBByAlice = await fhevm.createEncryptedInput(voteChainAddress, signers.alice.address).add8(1).encrypt();
    const voteTx1 = await voteChain.connect(signers.alice).vote(pollId, encryptedVoteBByAlice.handles[0], encryptedVoteBByAlice.inputProof);
    await voteTx1.wait();

    const encryptedVoteBByBob = await fhevm.createEncryptedInput(voteChainAddress, signers.bob.address).add8(1).encrypt();
    const voteTx2 = await voteChain.connect(signers.bob).vote(pollId, encryptedVoteBByBob.handles[0], encryptedVoteBByBob.inputProof);
    await voteTx2.wait();

    await expect(
      voteChain.connect(signers.bob).vote(pollId, encryptedVoteBByBob.handles[0], encryptedVoteBByBob.inputProof),
    ).to.be.revertedWithCustomError(voteChain, "AlreadyVoted");

    await time.increaseTo(Number(endTime));
    const endTx = await voteChain.connect(signers.alice).endPoll(pollId);
    await endTx.wait();

    const handles: string[] = [];
    for (let i = 0; i < options.length; i++) {
      handles.push(await voteChain.getEncryptedTally(pollId, i));
    }

    const decrypted = await fhevm.publicDecrypt(handles);
    const clearValues = decrypted.clearValues as Record<string, bigint>;

    expect(clearValues[handles[0]]).to.eq(0n);
    expect(clearValues[handles[1]]).to.eq(2n);
    expect(clearValues[handles[2]]).to.eq(0n);

    const publishTx = await voteChain
      .connect(signers.deployer)
      .publishResults(pollId, decrypted.abiEncodedClearValues, decrypted.decryptionProof);
    await publishTx.wait();

    const posted0 = await voteChain.getPostedTally(pollId, 0);
    const posted1 = await voteChain.getPostedTally(pollId, 1);
    const posted2 = await voteChain.getPostedTally(pollId, 2);

    expect(posted0[0]).to.eq(true);
    expect(posted0[1]).to.eq(0);
    expect(posted1[1]).to.eq(2);
    expect(posted2[1]).to.eq(0);
  });
});

