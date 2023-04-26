// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/governance/Governor.sol';
import '@openzeppelin/contracts/governance/TimelockController.sol';
import '@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol';
import '@openzeppelin/contracts/governance/extensions/GovernorSettings.sol';
import '@openzeppelin/contracts/governance/extensions/GovernorVotes.sol';
import '@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol';
import '@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol';

import './Controller.sol';


contract LotteryGovernor is Governor, GovernorSettings, GovernorVotes, GovernorVotesQuorumFraction,
    GovernorCountingSimple, GovernorTimelockControl
{
  /// @dev The voting delay is initialized to 0 and the voting period is initialized to 20m
  ///   (assuming an average block time of 2s, as it should be the case in Polygon PoS). These
  ///   values are for the initial manual testing and should be amended after deployment. Ideally
  ///   the voting delay should be 1 day and the voting period 1 week.
  constructor(ERC20Votes token, LotteryController controller)
      Governor('ExaLotto')
      GovernorSettings(
          /*votingDelay=*/0,
          /*votingPeriod=*/600,
          /*proposalThreshold=*/1e7 ether)
      GovernorVotes(token)
      GovernorVotesQuorumFraction(40)
      GovernorCountingSimple()
      GovernorTimelockControl(controller) {}

  // The functions below are overrides required by Solidity.

  function _cancel(
      address[] memory targets, uint256[] memory values, bytes[] memory calldatas,
      bytes32 descriptionHash
  )
      internal
      override (Governor, GovernorTimelockControl)
      returns (uint256)
  {
    return super._cancel(targets, values, calldatas, descriptionHash);
  }

  function _execute(
      uint256 proposalId, address[] memory targets, uint256[] memory values,
      bytes[] memory calldatas, bytes32 descriptionHash
  )
      internal
      override (Governor, GovernorTimelockControl)
  {
    super._execute(proposalId, targets, values, calldatas, descriptionHash);
  }

  function _executor()
      internal
      view
      override (Governor, GovernorTimelockControl)
      returns (address)
  {
    return super._executor();
  }

  function proposalThreshold()
      public
      view
      override (Governor, GovernorSettings)
      returns (uint256)
  {
    return super.proposalThreshold();
  }

  function state(uint256 proposalId)
      public
      view
      override (Governor, GovernorTimelockControl)
      returns (ProposalState)
  {
    return super.state(proposalId);
  }

  function supportsInterface(bytes4 interfaceId)
      public
      view
      override (Governor, GovernorTimelockControl)
      returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }
}
