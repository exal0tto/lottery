const {ethers} = require('hardhat');

const {deploy, deployWithProxy, getDefaultSigner, send} = require('./utils');


exports.Deployer = class Deployer {
  constructor() {
    this._signers = [];
    this._deployer = void 0;
  }

  async getDefaultSigner() {
    const signer = await getDefaultSigner();
    return await signer.getAddress();
  }

  async init(owner) {
    this._signers = await ethers.getSigners();
    this._owner = owner || await this.getDefaultSigner();
    this._deployer = await this._signers[0].getAddress();
    console.log('Deployer initialized, the signer is', this._deployer);
  }

  deployMockVRFCoordinator() {
    return deploy('MockVRFCoordinator');
  }

  async deployToken() {
    const token = await deploy('LotteryToken');
    if (this._deployer !== this._owner) {
      const totalSupply = await token.totalSupply();
      let tx = await send(token, 'transfer', this._owner, totalSupply);
      console.log(`Total EXL supply transferred to ${this._owner} -- txid ${tx.hash}`);
    }
    return token;
  }

  async deployLibraries() {
    const drawingLibrary = await deploy('Drawing');
    const indexLibrary = await deploy('TicketIndex');
    const ticketLibrary = await deploy('UserTickets');
    return {drawingLibrary, indexLibrary, ticketLibrary};
  }

  async deployLotteryImpl({drawingLibrary, indexLibrary, ticketLibrary}) {
    return await deploy('Lottery', [], {
      Drawing: drawingLibrary.address,
      TicketIndex: indexLibrary.address,
      UserTickets: ticketLibrary.address,
    });
  }

  async deployLottery(vrfCoordinatorAddress = process.env.CHAINLINK_VRF_COORDINATOR) {
    const {drawingLibrary, indexLibrary, ticketLibrary} = await this.deployLibraries();
    const lottery = await deployWithProxy('Lottery', [vrfCoordinatorAddress], {
      Drawing: drawingLibrary.address,
      TicketIndex: indexLibrary.address,
      UserTickets: ticketLibrary.address,
    });
    return {drawingLibrary, indexLibrary, ticketLibrary, lottery};
  }

  async deployController(token, lottery) {
    const owners = [this._owner];
    let tx;
    const controller = await deploy('LotteryController', [
        token.address, lottery.address, owners, owners]);
    const TIMELOCK_ADMIN_ROLE = await controller.TIMELOCK_ADMIN_ROLE();
    const PROPOSER_ROLE = await controller.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await controller.EXECUTOR_ROLE();
    const CANCELLER_ROLE = await controller.CANCELLER_ROLE();
    tx = await send(lottery, 'transferOwnership', controller.address);
    console.log(`Lottery ownership transferred to ${controller.address} -- txid ${tx.hash}`);
    tx = await send(controller, 'grantRole', TIMELOCK_ADMIN_ROLE, this._owner);
    console.log(`TIMELOCK_ADMIN_ROLE granted to ${this._owner} -- txid ${tx.hash}`);
    if (this._deployer !== this._owner) {
      tx = await send(controller, 'renounceRole', PROPOSER_ROLE, this._deployer);
      console.log(`PROPOSER_ROLE renounced by ${this._deployer} -- txid ${tx.hash}`);
      tx = await send(controller, 'renounceRole', EXECUTOR_ROLE, this._deployer);
      console.log(`EXECUTOR_ROLE renounced by ${this._deployer} -- txid ${tx.hash}`);
      tx = await send(controller, 'renounceRole', CANCELLER_ROLE, this._deployer);
      console.log(`CANCELLER_ROLE renounced by ${this._deployer} -- txid ${tx.hash}`);
    }
    return controller;
  }

  async deployGovernor(token, controller) {
    const TIMELOCK_ADMIN_ROLE = await controller.TIMELOCK_ADMIN_ROLE();
    const PROPOSER_ROLE = await controller.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await controller.EXECUTOR_ROLE();
    const CANCELLER_ROLE = await controller.CANCELLER_ROLE();
    let tx;
    const governor = await deploy('LotteryGovernor', [token.address, controller.address]);
    tx = await send(controller, 'grantRole', TIMELOCK_ADMIN_ROLE, governor.address);
    console.log(`TIMELOCK_ADMIN_ROLE granted to ${governor.address} -- txid ${tx.hash}`);
    tx = await send(controller, 'grantRole', PROPOSER_ROLE, governor.address);
    console.log(`PROPOSER_ROLE granted to ${governor.address} -- txid ${tx.hash}`);
    tx = await send(controller, 'grantRole', EXECUTOR_ROLE, governor.address);
    console.log(`EXECUTOR_ROLE granted to ${governor.address} -- txid ${tx.hash}`);
    tx = await send(controller, 'grantRole', CANCELLER_ROLE, governor.address);
    console.log(`CANCELLER_ROLE granted to ${governor.address} -- txid ${tx.hash}`);
    if (this._deployer !== this._owner) {
      tx = await send(controller, 'renounceRole', TIMELOCK_ADMIN_ROLE, this._deployer);
      console.log(`TIMELOCK_ADMIN_ROLE renounced by ${this._deployer} -- txid ${tx.hash}`);
    }
  }

  async deployAll(vrfCoordinatorAddress = process.env.CHAINLINK_VRF_COORDINATOR) {
    const token = await this.deployToken();
    const {lottery} = await this.deployLottery(vrfCoordinatorAddress);
    const controller = await this.deployController(token, lottery);
    const governor = await this.deployGovernor(token, controller);
    return {token, lottery, controller, governor};
  }
};
