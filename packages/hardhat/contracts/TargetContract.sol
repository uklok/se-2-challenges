// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;  //Do not change the solidity version as it negativly impacts submission grading

import "./ExampleExternalContract.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract TargetContract is ExampleExternalContract, AccessControl {
  bytes32 public constant STAKING_ROLE = keccak256("STAKING_ROLE");
  bytes32 public constant WITHDRAW_ROLE = keccak256("WITHDRAW_ROLE");

  bool public completed;

  constructor() {
    address to = _msgSender();

    _grantRole(DEFAULT_ADMIN_ROLE, to);
    _grantRole(WITHDRAW_ROLE, to);
  }

  function complete() public payable onlyRole(STAKING_ROLE) {
    completed = true;
  }

  function withdraw() public onlyRole(WITHDRAW_ROLE) {
    uint amount = address(this).balance;
    require(amount > 0, "No balance");

    require(completed, "Not completed");
    (bool sent, bytes memory data) = payable(msg.sender).call{value: address(this).balance}("");

    require(sent, "Failed to send Ether");
    completed = false;
  }
}
