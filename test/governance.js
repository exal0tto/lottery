const {ethers} = require('hardhat');
const helpers = require('@nomicfoundation/hardhat-network-helpers');
const {expect} = require('chai');

const {Deployer} = require('../scripts/deployer');
const {advanceTime, advanceTimeToNextDrawing} = require('./utils');


const NULL_REFERRAL_CODE = '0x0000000000000000000000000000000000000000000000000000000000000000';

const ONE_WEEK = 60 * 60 * 24 * 7;


describe('Governance', () => {
  const deployer = new Deployer();

  let signer;

  let vrfCoordinator;
  const subscriptionId = 1;
  let requestId = 1;

  let snapshot;
  let token, lottery, controller;

  before(async () => {
    await deployer.init();
    signer = await deployer.getDefaultSigner();
    vrfCoordinator = await deployer.deployMockVRFCoordinator();
    await vrfCoordinator.createSubscription();
    const contracts = await deployer.deployAll(vrfCoordinator.address);
    token = contracts.token;
    lottery = contracts.lottery;
    controller = contracts.controller;
    await vrfCoordinator.addConsumer(subscriptionId, lottery.address);
    token.delegate(signer);
    await helpers.mine();
    console.log('signer:', signer);
    console.log('signer\'s balance:', (await token.balanceOf(signer)).toBigInt());
  });

  beforeEach(async () => {
    snapshot = await helpers.takeSnapshot();
    await advanceTimeToNextDrawing();
  });

  afterEach(async () => {
    await snapshot.restore();
    requestId = 1;
  });

  const buyTicket = async numbers => {
    const price = await lottery.getTicketPrice(numbers);
    await lottery.buyTicket(NULL_REFERRAL_CODE, numbers, {value: price});
  };

  const draw = async () => {
    await controller.draw(subscriptionId, process.env.CHAINLINK_VRF_KEY_HASH);
    await vrfCoordinator.fulfillRandomWordsWithOverride(requestId++, lottery.address, [0], {
      gasLimit: process.env.EXALOTTO_CALLBACK_GAS_LIMIT,
    });
    await helpers.mine();
    await controller.closeRound();
    await helpers.mine();
  };

  it('pause', async () => {
    expect(await lottery.paused()).to.equal(false);
    expect(await controller.paused()).to.equal(false);
    await controller.pause();
    expect(await lottery.paused()).to.equal(true);
    expect(await controller.paused()).to.equal(true);
    await controller.unpause();
    expect(await lottery.paused()).to.equal(false);
    expect(await controller.paused()).to.equal(false);
  });

  it('initial revenue', async () => {
    expect(await controller.getUnclaimedRevenue(signer)).to.equal(0);
  });

  it('revenue', async () => {
    await buyTicket([4, 5, 6, 7, 8, 9]);
    await draw();
    const balance = await controller.provider.getBalance(controller.address);
    expect(balance).to.not.equal(0);
    const unclaimed = await controller.getUnclaimedRevenue(signer);
    expect(balance).to.equal(unclaimed);
  });

  it('revenue growth', async () => {
    await buyTicket([1, 2, 3, 4, 5, 6]);
    await draw();
    await advanceTime(ONE_WEEK);
    const unclaimed1 = await controller.getUnclaimedRevenue(signer);
    await buyTicket([4, 5, 6, 7, 8, 9]);
    await draw();
    const unclaimed2 = await controller.getUnclaimedRevenue(signer);
    expect(unclaimed2.gt(unclaimed1)).to.equal(true);
    const balance = await controller.provider.getBalance(controller.address);
    expect(balance.eq(unclaimed2)).to.equal(true);
  });

  it('withdrawal', async () => {
    await buyTicket([1, 2, 3, 4, 5, 6]);
    await buyTicket([4, 5, 6, 7, 8, 9]);
    await draw();
    const unclaimed1 = await controller.getUnclaimedRevenue(signer);
    await controller.withdraw(signer);
    const unclaimed2 = await controller.getUnclaimedRevenue(signer);
    expect(unclaimed2).to.equal(0);
  });
});
