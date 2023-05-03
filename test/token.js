const {ethers} = require('hardhat');
const helpers = require('@nomicfoundation/hardhat-network-helpers');
const {expect} = require('chai');

const {Deployer} = require('../scripts/deployer');


describe('Token', () => {
  const deployer = new Deployer();

  let account1, account2;
  let token;

  let snapshot;

  before(async () => {
    await deployer.init();
    const signers = await ethers.getSigners();
    account1 = await signers[0].getAddress();
    account2 = await signers[1].getAddress();
    token = await deployer.deployToken();
  });

  beforeEach(async () => {
    snapshot = await helpers.takeSnapshot();
  });

  afterEach(async () => {
    await snapshot.restore();
  });

  it('initial state', async () => {
    const time = await helpers.time.latestBlock();
    expect(await token.getTotalVotes()).to.equal(0);
    expect(await token.getPastTotalVotes(time - 1)).to.equal(0);
    expect(await token.getPastTotalVotes(time)).to.equal(0);
    expect(await token.getPastTotalVotes(time + 1)).to.equal(0);
  });

  it('transfer', async () => {
    await token.transfer(account2, 1000);
    const time = await helpers.time.latestBlock();
    expect(await token.getTotalVotes()).to.equal(0);
    expect(await token.getPastTotalVotes(time - 1)).to.equal(0);
    expect(await token.getPastTotalVotes(time)).to.equal(0);
    expect(await token.getPastTotalVotes(time + 1)).to.equal(0);
  });

  it('burn', async () => {
    await token.burn(1000);
    const time = await helpers.time.latestBlock();
    expect(await token.getTotalVotes()).to.equal(0);
    expect(await token.getPastTotalVotes(time - 1)).to.equal(0);
    expect(await token.getPastTotalVotes(time)).to.equal(0);
    expect(await token.getPastTotalVotes(time + 1)).to.equal(0);
  });

  it('delegated', async () => {
    const totalSupply = await token.totalSupply();
    const t0 = await helpers.time.latestBlock();
    await token.delegate(account2);
    const t1 = await helpers.time.latestBlock();
    expect(await token.getTotalVotes()).to.equal(totalSupply);
    expect(await token.getPastTotalVotes(t0)).to.equal(0);
    expect(await token.getPastTotalVotes(t1)).to.equal(totalSupply);
    expect(await token.getPastTotalVotes(t1 + 1)).to.equal(totalSupply);
  });

  it('transfer and delegate', async () => {
    const totalSupply = (await token.totalSupply()).toBigInt();
    const t0 = await helpers.time.latestBlock();
    await token.transfer(account2, 1000);
    const t1 = await helpers.time.latestBlock();
    await token.delegate(account2);
    const t2 = await helpers.time.latestBlock();
    expect(await token.getTotalVotes()).to.equal(totalSupply - 1000n);
    expect(await token.getPastTotalVotes(t0)).to.equal(0);
    expect(await token.getPastTotalVotes(t1)).to.equal(0);
    expect(await token.getPastTotalVotes(t2)).to.equal(totalSupply - 1000n);
    expect(await token.getPastTotalVotes(t2 + 1)).to.equal(totalSupply - 1000n);
  });

  it('delegate and transfer', async () => {
    const totalSupply = (await token.totalSupply()).toBigInt();
    const t0 = await helpers.time.latestBlock();
    await token.delegate(account2);
    const t1 = await helpers.time.latestBlock();
    await token.transfer(account2, 1000);
    const t2 = await helpers.time.latestBlock();
    expect(await token.getTotalVotes()).to.equal(totalSupply - 1000n);
    expect(await token.getPastTotalVotes(t0)).to.equal(0);
    expect(await token.getPastTotalVotes(t1)).to.equal(totalSupply);
    expect(await token.getPastTotalVotes(t2)).to.equal(totalSupply - 1000n);
    expect(await token.getPastTotalVotes(t2 + 1)).to.equal(totalSupply - 1000n);
  });

  it('delegate and burn', async () => {
    const totalSupply = (await token.totalSupply()).toBigInt();
    const t0 = await helpers.time.latestBlock();
    await token.delegate(account2);
    const t1 = await helpers.time.latestBlock();
    await token.burn(1234);
    const t2 = await helpers.time.latestBlock();
    expect(await token.getTotalVotes()).to.equal(totalSupply - 1234n);
    expect(await token.getPastTotalVotes(t0)).to.equal(0);
    expect(await token.getPastTotalVotes(t1)).to.equal(totalSupply);
    expect(await token.getPastTotalVotes(t2)).to.equal(totalSupply - 1234n);
    expect(await token.getPastTotalVotes(t2 + 1)).to.equal(totalSupply - 1234n);
  });
});
