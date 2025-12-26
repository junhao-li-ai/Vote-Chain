import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedVoteChain = await deploy("VoteChain", {
    from: deployer,
    log: true,
  });

  console.log(`VoteChain contract: `, deployedVoteChain.address);
};
export default func;
func.id = "deploy_voteChain"; // id required to prevent reexecution
func.tags = ["VoteChain"];
