const {ethers, upgrades} = require('hardhat');

const readline = require('readline');


let nonce = process.env.EXALOTTO_NONCE_OVERRIDE ?
    parseInt(process.env.EXALOTTO_NONCE_OVERRIDE, 10) :
    null;

if (nonce !== null) {
  console.log('Initial nonce:', nonce);
}


function overrides(options) {
  if (!options) {
    options = {};
  }
  if (nonce !== null) {
    options.nonce = nonce++;
  }
  return options;
}


async function retry(action) {
  let attempts = parseInt(process.env.EXALOTTO_DEPLOYMENT_ATTEMPTS, 10);
  while (attempts-- !== 0) {
    try {
      return await action();
    } catch (e) {
      console.error(e);
      console.log('Retrying...');
    }
  }
  throw new Error(`action failed after ${process.env.EXALOTTO_DEPLOYMENT_ATTEMPTS} attempts`);
}


exports.deploy = async (name, args = [], libraries = {}) => {
  return await retry(async () => {
    const factory = await ethers.getContractFactory(name, {libraries});
    const contract = await factory.deploy(...args, overrides());
    await contract.deployed();
    const transaction = contract.deployTransaction;
    await transaction.wait(process.env.EXALOTTO_CONFIRMATIONS);
    console.log(`${name} deployed to: ${contract.address} -- txid ${transaction.hash}`);
    return contract;
  });
};


exports.deployWithProxy = async (name, args = [], libraries = null) => {
  return await retry(async () => {
    const factory = await ethers.getContractFactory(name, {
      libraries: libraries || {},
    });
    const contract = await upgrades.deployProxy(factory, args, overrides({
      unsafeAllowLinkedLibraries: !!libraries,
    }));
    await contract.deployed();
    const transaction = contract.deployTransaction;
    await transaction.wait(process.env.EXALOTTO_CONFIRMATIONS);
    console.log(`${name} deployed to: ${contract.address} -- txid ${transaction.hash}`);
    return contract;
  });
};


exports.attach = async (name, address) => {
  const factory = await ethers.getContractFactory(name);
  return factory.attach(address);
};


exports.sendOnce = async (contract, method, ...args) => {
  const transaction = await contract[method](...args);
  await transaction.wait(process.env.EXALOTTO_CONFIRMATIONS);
  return transaction;
};


exports.send = async (contract, method, ...args) => await retry(async () => {
  const transaction = await contract[method](...args);
  await transaction.wait(process.env.EXALOTTO_CONFIRMATIONS);
  return transaction;
});


exports.readLine = async prompt => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close();
      resolve(answer);
    });
  });
};


exports.getDefaultSigner = async () => {
  const signers = await ethers.getSigners();
  if (!signers.length) {
    throw new Error('no signers');
  }
  return signers[0];
};
