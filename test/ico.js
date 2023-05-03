const {ethers} = require('hardhat');
const helpers = require('@nomicfoundation/hardhat-network-helpers');
const {expect} = require('chai');

const {Deployer} = require('../scripts/deployer');


const NULL_REFERRAL_CODE = '0x0000000000000000000000000000000000000000000000000000000000000000';

const ONE_WEEK = 60 * 60 * 24 * 7;


describe('Governance', () => {
  const deployer = new Deployer();

  let owner, partner;

  let snapshot;
  let token, ico, partnerIco;

  let totalSupply;
  const price = 750000000000000000n;

  before(async () => {
    await deployer.init();
    const signers = await ethers.getSigners();
    owner = await signers[0].getAddress();
    partner = await signers[1].getAddress();
    const contracts = await deployer.deployAll();
    token = contracts.token;
    ico = contracts.ico;
    partnerIco = await ico.connect(signers[1]);
    totalSupply = (await token.totalSupply()).toBigInt();
  });

  beforeEach(async () => {
    snapshot = await helpers.takeSnapshot();
  });

  afterEach(async () => {
    await snapshot.restore();
  });

  const getPrice = amount => BigInt(amount) * price / (10n ** 18n);

  it('initial state', async () => {
    expect(await token.balanceOf(ico.address)).to.equal(totalSupply);
    expect(await ico.isOpen()).to.equal(false);
    expect(await ico.balanceOf(owner)).to.equal(0);
    expect(await ico.balanceOf(partner)).to.equal(0);
    await expect(partnerIco.buyTokens(1)).to.be.reverted;
  });

  it('open', async () => {
    await ico.open(12345, price);
    expect(await ico.isOpen()).to.equal(true);
    expect(await token.balanceOf(ico.address)).to.equal(totalSupply);
    expect(await ico.balanceOf(owner)).to.equal(0);
    expect(await ico.balanceOf(partner)).to.equal(0);
  });

  it('buy', async () => {
    await ico.open(12345, price);
    await partnerIco.buyTokens(123, {value: getPrice(123)});
    expect(await ico.balanceOf(owner)).to.equal(0);
    expect(await ico.balanceOf(partner)).to.equal(123);
  });

  it('incorrect value', async () => {
    await ico.open(12345, price);
    await expect(partnerIco.buyTokens(123, {value: getPrice(1234)})).to.be.reverted;
  });

  it('buy too many', async () => {
    await ico.open(12345, price);
    await expect(partnerIco.buyTokens(123456, {value: getPrice(123456)})).to.be.reverted;
  });

  it('cannot withdraw while open', async () => {
    await ico.open(12345, price);
    await partnerIco.buyTokens(1234, {value: getPrice(1234)});
    await expect(partnerIco.withdraw(123)).to.be.reverted;
  });

  it('close', async () => {
    await ico.open(12345, price);
    await ico.close();
    expect(await ico.isOpen()).to.equal(false);
    expect(await token.balanceOf(ico.address)).to.equal(totalSupply);
    expect(await ico.balanceOf(owner)).to.equal(0);
    expect(await ico.balanceOf(partner)).to.equal(0);
  });

  it('buy and close', async () => {
    await ico.open(12345, price);
    await partnerIco.buyTokens(123, {value: getPrice(123)});
    await ico.close();
    expect(await ico.isOpen()).to.equal(false);
    expect(await token.balanceOf(ico.address)).to.equal(totalSupply);
    expect(await ico.balanceOf(owner)).to.equal(0);
    expect(await ico.balanceOf(partner)).to.equal(123);
  });

  it('withdraw', async () => {
    await ico.open(12345, price);
    await partnerIco.buyTokens(1234, {value: getPrice(1234)});
    await ico.close();
    await partnerIco.withdraw(123);
    expect(await ico.isOpen()).to.equal(false);
    expect(await token.balanceOf(ico.address)).to.equal(totalSupply - 123n);
    expect(await token.balanceOf(partner)).to.equal(123);
    expect(await ico.balanceOf(owner)).to.equal(0);
    expect(await ico.balanceOf(partner)).to.equal(1234 - 123);
  });

  it('cannot withdraw more than balance', async () => {
    await ico.open(12345, price);
    await partnerIco.buyTokens(123, {value: getPrice(123)});
    await ico.close();
    await expect(partnerIco.withdraw(1234)).to.be.reverted;
  });

  // TODO: test lottery funding
});
