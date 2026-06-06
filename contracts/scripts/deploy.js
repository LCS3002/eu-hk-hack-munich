const { writeFileSync } = require('fs')
const { join } = require('path')
const { ethers, network } = require('hardhat')

const USDC_DECIMALS = 6

// Deploys the Harbour contract layer:
//   1. MockUSDC (stand-in regulated stablecoin)
//   2. TradeEscrow(usdc, oracle = deployer)
// then mints a demo balance to the deployer (the demo buyer) and writes
// deployment.json for the bridge / frontend to pick up.
async function main() {
  const [deployer] = await ethers.getSigners()
  const oracle = deployer.address // deployer also plays the compliance oracle

  console.log(`Deploying with account: ${deployer.address}`)
  console.log(`Network:               ${network.name}`)

  const MockUSDC = await ethers.getContractFactory('MockUSDC')
  const usdc = await MockUSDC.deploy()
  await usdc.waitForDeployment()
  const usdcAddress = await usdc.getAddress()

  const TradeEscrow = await ethers.getContractFactory('TradeEscrow')
  const escrow = await TradeEscrow.deploy(usdcAddress, oracle)
  await escrow.waitForDeployment()
  const escrowAddress = await escrow.getAddress()

  const faucetAmount = ethers.parseUnits('1000000', USDC_DECIMALS)
  await (await usdc.mint(deployer.address, faucetAmount)).wait()

  // Pre-approve the escrow to pull the buyer's stablecoin, so per-settlement
  // there is no approve tx — keeps live settlement fast and serverless-friendly.
  await (await usdc.approve(escrowAddress, ethers.MaxUint256)).wait()

  console.log('\n──────────────────────────────────────────────')
  console.log(`USDC_ADDRESS=${usdcAddress}`)
  console.log(`ESCROW_ADDRESS=${escrowAddress}`)
  console.log(`ORACLE=${oracle}`)
  console.log(`Minted 1,000,000 mUSDC to demo buyer ${deployer.address}`)
  console.log('──────────────────────────────────────────────\n')

  const deployment = { usdc: usdcAddress, escrow: escrowAddress, oracle, network: network.name }
  writeFileSync(join(__dirname, '..', 'deployment.json'), `${JSON.stringify(deployment, null, 2)}\n`)
  console.log('Wrote deployment.json')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
