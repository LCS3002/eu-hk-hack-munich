require('@nomicfoundation/hardhat-toolbox')
require('dotenv').config({ path: '../.env' })

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  solidity: {
    version: '0.8.24',
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    // `npx hardhat node` serves localhost; deploy with --network localhost
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
      accounts: process.env.SEPOLIA_PRIVATE_KEY ? [process.env.SEPOLIA_PRIVATE_KEY] : [],
    },
  },
  // `npx hardhat verify --network sepolia <addr> [args]` publishes source to
  // Etherscan so the deployed escrow + token are inspectable on-chain.
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || '',
  },
}
