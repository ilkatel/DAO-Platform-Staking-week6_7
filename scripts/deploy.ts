import { ethers } from "hardhat";
import { ACDMPlatform__factory, DAO__factory, ERCTOKEN__factory, Staking__factory } from "../typechain";
import { run } from "hardhat";

const duration = 24*3*3600;

async function delpoy() {
  const [signer] = await ethers.getSigners();

  // XXXToken ==============================================================================
  const XXXtoken = await new ERCTOKEN__factory(signer).deploy("XXXToken", "XXX", 18);
  await XXXtoken.deployed();
  console.log(`XXXtoken deployed to: ${XXXtoken.address}`);

  // Uniswap ===============================================================================
  const factory = await ethers.getContractAt("IUniswapV2Factory", process.env.FACTORY as string, signer);
  const router = await ethers.getContractAt("IUniswapV2Router02", process.env.ROUTER as string, signer);

  await XXXtoken.mint(signer.address, ethers.utils.parseEther("1000"));
  await XXXtoken.approve(router.address, ethers.utils.parseEther("1000"));

  const tx = await router.addLiquidityETH(
    XXXtoken.address,
    ethers.utils.parseEther("1000"),
    100,
    100,
    signer.address,
    1e10,
    { value: ethers.utils.parseEther("0.1") }
  );
  await tx.wait();
  
  const pair = await factory.getPair(XXXtoken.address, await router.WETH());
  const uniswap = await ethers.getContractAt("IUniswapV2Pair", pair, signer);
  console.log(`Getted pair at: ${uniswap.address}`);
  
  // DAO ===================================================================================
  const dao = await new DAO__factory(signer).deploy(2, duration);
  await dao.deployed();
  console.log(`DAO deployed to: ${dao.address}`);
  
  // ACDMToken =============================================================================
  const ACDMtoken = await new ERCTOKEN__factory(signer).deploy("ACDMToken", "ACDM", 6);
  await ACDMtoken.deployed();
  console.log(`ACDMToken deployed to: ${ACDMtoken.address}`);

  await ACDMtoken.mint(signer.address, ethers.utils.parseEther("10000000"));

  // ACDMPlatform ==========================================================================
  const ACDMplatform = await new ACDMPlatform__factory(signer).deploy(ACDMtoken.address, dao.address, router.address, XXXtoken.address);
  await ACDMplatform.deployed();
  console.log(`ACDMPlatform deployed to: ${ACDMplatform.address}`);

  await ACDMtoken.changeRights(ACDMplatform.address);
  await ACDMtoken.approve(ACDMplatform.address, ethers.utils.parseEther("10000000"));
  
  // Staking ===============================================================================
  const staking = await new Staking__factory(signer).deploy(dao.address, uniswap.address, XXXtoken.address, 10, 1000);
  await staking.deployed();
  console.log(`Staking deployed to: ${staking.address}`);

  await uniswap.approve(staking.address, ethers.utils.parseEther("1000"));
  await XXXtoken.mint(staking.address, ethers.utils.parseEther("10000000"));
  
  // =======================================================================================
  await dao.setStaking(staking.address);

  
  // Verify ================================================================================
  await run("verify:verify", {
    address: XXXtoken.address,
    constructorArguments: ["XXXToken", "XXX", 18],
  });

  await run("verify:verify", {
    address: dao.address,
    constructorArguments: [2, duration],
  });

  await run("verify:verify", {
    address: ACDMtoken.address,
    constructorArguments: ["ACDMToken", "ACDM", 6],
  });

  await run("verify:verify", {
    address: ACDMplatform.address,
    constructorArguments: [ACDMtoken.address, dao.address, router.address, XXXtoken.address],
  });

  await run("verify:verify", {
    address: staking.address,
    constructorArguments: [dao.address, uniswap.address, XXXtoken.address, 10, 1000],
  });
}

delpoy().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
