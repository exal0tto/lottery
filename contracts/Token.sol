// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol';
import '@openzeppelin/contracts/utils/math/SafeCast.sol';


contract LotteryToken is ERC20, ERC20Burnable, ERC20Votes {
  /// @dev Keeps track of every change in the total delegated voting power.
  Checkpoint[] private _totalDelegationCheckpoints;

  constructor() ERC20('ExaLotto', 'EXL') ERC20Permit('ExaLotto') {
    _mint(msg.sender, 1e9 ether);
  }

  /// @notice Returns the total delegated voting power.
  function getTotalDelegatedVotes() public view returns (uint256) {
    if (_totalDelegationCheckpoints.length > 0) {
      return _totalDelegationCheckpoints[_totalDelegationCheckpoints.length - 1].votes;
    } else {
      return 0;
    }
  }

  /// @notice Returns the total delegated voting power at a past point in time.
  function getPastTotalDelegatedVotes(uint256 blockNumber) public view returns (uint256) {
    uint i = 0;
    uint j = _totalDelegationCheckpoints.length;
    while (i < j) {
      uint k = i + ((j - i) >> 1);
      Checkpoint storage checkpoint = _totalDelegationCheckpoints[k];
      if (checkpoint.fromBlock <= blockNumber) {
        i = k + 1;
      } else {
        j = k;
      }
    }
    if (i == 0) {
      return 0;
    } else if (i < _totalDelegationCheckpoints.length) {
      return _totalDelegationCheckpoints[i - 1].votes;
    } else if (_totalDelegationCheckpoints.length > 0) {
      return _totalDelegationCheckpoints[_totalDelegationCheckpoints.length - 1].votes;
    } else {
      return 0;
    }
  }

  function _afterTokenTransfer(address from, address to, uint256 amount)
      internal override (ERC20, ERC20Votes)
  {
    super._afterTokenTransfer(from, to, amount);
    address fromDelegatee = delegates(from);
    address toDelegatee = delegates(to);
    uint256 votes = getTotalDelegatedVotes();
    if (fromDelegatee == address(0) && toDelegatee != address(0)) {
      votes += amount;
    }
    if (fromDelegatee != address(0) && toDelegatee == address(0)) {
      votes -= amount;
    }
    _totalDelegationCheckpoints.push(Checkpoint({
      fromBlock: SafeCast.toUint32(block.number),
      votes: SafeCast.toUint224(votes)
    }));
  }

  function _delegate(address delegator, address delegatee) internal override {
    address formerDelegatee = delegates(delegator);
    super._delegate(delegator, delegatee);
    uint256 votes = getTotalDelegatedVotes();
    if (formerDelegatee == address(0) && delegatee != address(0)) {
      votes += balanceOf(delegator);
    }
    if (formerDelegatee != address(0) && delegatee == address(0)) {
      votes -= balanceOf(delegator);
    }
    _totalDelegationCheckpoints.push(Checkpoint({
      fromBlock: SafeCast.toUint32(block.number),
      votes: SafeCast.toUint224(votes)
    }));
  }

  // The functions below are overrides required by Solidity.

  function _burn(address account, uint256 amount) internal override (ERC20, ERC20Votes) {
    super._burn(account, amount);
  }

  function _mint(address account, uint256 amount) internal override (ERC20, ERC20Votes) {
    super._mint(account, amount);
  }
}
