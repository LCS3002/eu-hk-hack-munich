const { expect } = require('chai')
const { ethers } = require('hardhat')

// Self-contained demo values (mirror src/lib/fixtures.ts) — kept local so the
// contracts project has no dependency on the frontend source tree.
const USDC_DECIMALS = 6
const CLEAN_TRADE = {
  amount: 46000,
  invoice: { invoiceRef: 'INV-2026-0473', hsCode: '8542.31', declaredValue: 46000, quantity: 5000 },
}
const DIRTY_TRADE = {
  amount: 74000,
  invoice: { invoiceRef: 'INV-2026-0489', hsCode: '8542.31', declaredValue: 74000, quantity: 5000 },
}

// End-to-end behaviour of the Harbour settlement gate against the two demo
// fixtures. The oracle (signers[0]) plays the off-chain AI compliance wallet
// that enforces the verdict on-chain.
describe('TradeEscrow', () => {
  async function deployFixture() {
    const [oracle, buyer, supplier] = await ethers.getSigners()

    const MockUSDC = await ethers.getContractFactory('MockUSDC')
    const usdc = await MockUSDC.deploy()
    await usdc.waitForDeployment()

    const TradeEscrow = await ethers.getContractFactory('TradeEscrow')
    const escrow = await TradeEscrow.deploy(await usdc.getAddress(), oracle.address)
    await escrow.waitForDeployment()

    return { usdc, escrow, oracle, buyer, supplier }
  }

  it('SETTLE: clean trade clears and releases USDC to the supplier', async () => {
    const { usdc, escrow, oracle, buyer, supplier } = await deployFixture()
    const trade = CLEAN_TRADE
    const amount = ethers.parseUnits(String(trade.amount), USDC_DECIMALS)
    const invoiceRef = ethers.encodeBytes32String(trade.invoice.invoiceRef)
    const hsCode = ethers.encodeBytes32String(trade.invoice.hsCode)
    const declaredValue = ethers.parseUnits(String(trade.invoice.declaredValue), USDC_DECIMALS)

    await usdc.mint(buyer.address, amount)
    await usdc.connect(buyer).approve(await escrow.getAddress(), amount)

    await escrow
      .connect(buyer)
      .deposit(invoiceRef, hsCode, declaredValue, BigInt(trade.invoice.quantity), supplier.address, amount)

    await escrow.connect(oracle).approveAndRelease(invoiceRef, 8)

    expect(await usdc.balanceOf(supplier.address)).to.equal(amount)
    expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(0n)

    const passport = await escrow.getPassport(invoiceRef)
    expect(Number(passport[6])).to.equal(2) // SETTLED
  })

  it('BLOCK: dirty trade is refused and the escrow keeps holding the funds', async () => {
    const { usdc, escrow, oracle, buyer, supplier } = await deployFixture()
    const trade = DIRTY_TRADE
    const amount = ethers.parseUnits(String(trade.amount), USDC_DECIMALS)
    const invoiceRef = ethers.encodeBytes32String(trade.invoice.invoiceRef)
    const hsCode = ethers.encodeBytes32String(trade.invoice.hsCode)
    const declaredValue = ethers.parseUnits(String(trade.invoice.declaredValue), USDC_DECIMALS)

    await usdc.mint(buyer.address, amount)
    await usdc.connect(buyer).approve(await escrow.getAddress(), amount)

    await escrow
      .connect(buyer)
      .deposit(invoiceRef, hsCode, declaredValue, BigInt(trade.invoice.quantity), supplier.address, amount)

    await escrow.connect(oracle).reject(invoiceRef, 'over-invoiced')

    expect(await usdc.balanceOf(supplier.address)).to.equal(0n)
    expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(amount)

    const passport = await escrow.getPassport(invoiceRef)
    expect(Number(passport[6])).to.equal(3) // BLOCKED
  })
})
