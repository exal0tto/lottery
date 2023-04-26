// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';

import './Lottery.sol';
import './Token.sol';


contract LotteryICO is Ownable, ReentrancyGuard {
  error InvalidStateError();
  error InsufficientTokensError(uint256 available, uint256 requested);
  error IncorrectValueError(uint256 got, uint256 want);
  error InsufficientBalanceError(uint256 amount, uint256 balance);

  /// @notice Address of the EXL token.
  LotteryToken public immutable token;

  /// @notice Address of the lottery smartcontract.
  Lottery public immutable lottery;

  /// @dev How many EXL-wei are being sold.
  uint256 private _tokensForSale = 0;

  /// @dev Price of 1 EXL in wei.
  uint256 private _price;

  /// @dev True iff token sales are open.
  bool private _open = false;

  /// @dev EXL balances. Each address can withdraw its EXL only while the token sale is close.
  mapping(address => uint256) private _balances;

  modifier whenOpen() {
    if (!_open) {
      revert InvalidStateError();
    }
    _;
  }

  modifier whenClose() {
    if (_open) {
      revert InvalidStateError();
    }
    _;
  }

  constructor(LotteryToken _token, Lottery _lottery) {
    token = _token;
    lottery = _lottery;
  }

  /// @return True iff token sales are open.
  function isOpen() public view returns (bool) {
    return _open;
  }

  /// @return The price of 1 EXL in wei.
  function getTokenPrice() public view whenOpen returns (uint256) {
    return _price;
  }

  /// @return How many EXL-wei are for sale.
  function getTokensForSale() public view whenOpen returns (uint256) {
    return _tokensForSale;
  }

  /// @notice Opens the token sale.
  /// @param tokensForSale How many EXL-wei can be sold.
  /// @param price The price of 1 EXL in wei.
  function open(uint256 tokensForSale, uint256 price) public onlyOwner whenClose {
    uint256 balance = token.balanceOf(address(this));
    if (tokensForSale > balance) {
      revert InsufficientTokensError(balance, tokensForSale);
    }
    _tokensForSale = tokensForSale;
    _price = price;
    _open = true;
  }

  /// @notice Closes the token sale.
  function close() public onlyOwner whenOpen nonReentrant {
    _open = false;
    lottery.fund{value: address(this).balance}();
  }

  /// @return The EXL balance of an account, in EXL-wei.
  function balanceOf(address account) public view returns (uint256) {
    return _balances[account];
  }

  /// @return The price in wei of the specified amount of EXL-wei.
  function getPrice(uint256 tokenAmount) public view whenOpen returns (uint256) {
    return _price * tokenAmount / (10 ** token.decimals());
  }

  /// @notice Buys the requested `amount` of EXL-wei and attributes them to the sender, reverting if
  ///   the token sale is close or if `msg.value` is different from `getPrice(amount)`. Note that
  ///   the acquired tokens are not yet transferred at this time, they're only associated with
  ///   `msg.sender`. This method can be invoked multiple times and all acquired amounts will add
  ///   up. The EXL balance of an account can be retrieved by calling `balanceOf`.
  function buyTokens(uint256 amount) public payable whenOpen {
    if (amount > _tokensForSale) {
      revert InsufficientTokensError(_tokensForSale, amount);
    }
    uint256 price = getPrice(amount);
    if (msg.value != price) {
      revert IncorrectValueError(msg.value, price);
    }
    _tokensForSale -= amount;
    _balances[msg.sender] += amount;
  }

  /// @notice Transfers the requested EXL-wei `amount` to the sender, reverting if the token sale is
  ///   still open or if `amount > balanceOf(msg.sender)`.
  function withdraw(uint256 amount) public whenClose nonReentrant {
    uint256 balance = _balances[msg.sender];
    if (amount > balance) {
      revert InsufficientBalanceError(amount, balance);
    }
    _balances[msg.sender] -= amount;
    token.transfer(msg.sender, amount);
  }

  /// @notice Transfers all EXL balance (as per `balanceOf(msg.sender)`) to the sender. Reverts if
  ///   the token sale is still open.
  function withdrawAll() public whenClose nonReentrant {
    uint256 balance = _balances[msg.sender];
    if (balance == 0) {
      revert InsufficientBalanceError(0, 0);
    }
    _balances[msg.sender] = 0;
    token.transfer(msg.sender, balance);
  }
}
