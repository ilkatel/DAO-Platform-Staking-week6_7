import * as dotenv from "dotenv";

import { task } from "hardhat/config";
import { ContractTransaction as tx } from "ethers";
import { staking, XXXtoken } from "../utils";

dotenv.config();

export default task("stake", "Stake XXXTokens")
  .addParam("amount", "Tokens amount")
  .setAction(async (taskArgs, hre) => {
    const _staking = await staking(hre);
    const _xxxtoken = await XXXtoken(hre);
    await _xxxtoken.approve(_staking.address, taskArgs.amount);
    await _staking.stake(taskArgs.amount).then((result: tx) => console.log(`tx hash: ${result.hash}`));
});