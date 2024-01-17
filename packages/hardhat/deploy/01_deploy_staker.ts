import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const MIN_DEADLINE = 60;

/**
 * Deploys a contract named "YourContract" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployStaker: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network goerli`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` which will fill DEPLOYER_PRIVATE_KEY
    with a random private key in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const fundingContract = await hre.ethers.getContract("TargetContract", deployer);

  const { STAKE_THRESHOLD = "1", DATE, SECONDS_FROM_NOW = ""} = process.env;
  const threshold = hre.ethers.utils.parseEther(STAKE_THRESHOLD);
  let deadline = 0;

  try {
    if (DATE === undefined && SECONDS_FROM_NOW === undefined)
      throw new Error("NO DATE OR SECONDS_FROM_NOW PROVIDED");

    const date = DATE ? Math.floor((new Date(DATE)).getTime() / 1000): NaN;
    const secondsFromNow = parseInt(SECONDS_FROM_NOW);
    const now = (await hre.ethers.provider.getBlock('latest')).timestamp;
    const validDate = date > now + MIN_DEADLINE;

    deadline = validDate ? date : secondsFromNow > MIN_DEADLINE ? now + secondsFromNow : 0;
  } catch (e) {
    console.warn("Defaulting to contract deadline of 1 week from now");
  }

  const stakerContract = await deploy("Staker", {
    from: deployer,
    // Contract constructor arguments
    args: [fundingContract.address, threshold, deadline],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });
  
  // get STAKING_ROLE from funding contract
    const stakingRole = await fundingContract.STAKING_ROLE();
    const hasRole = await fundingContract.hasRole(stakingRole, stakerContract.address);
    if (!hasRole) {
      console.log("Granting staking role to staker contract");
      const grantTx = await fundingContract.grantRole(stakingRole, stakerContract.address);

      await grantTx.wait();
      console.log("Granted staking role to staker contract");
    }
};

export default deployStaker;

deployStaker.tags = ["Staker"];
