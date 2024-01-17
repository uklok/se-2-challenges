// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;  //Do not change the solidity version as it negativly impacts submission grading

import "./ExampleExternalContract.sol";

contract Staker {
    ExampleExternalContract public fundingContract;

    uint256 public immutable threshold;
    uint256 public immutable deadline;

    mapping(address => uint256) public balances;

    event Stake(address indexed sender, uint256 amount);
    event Withdraw(address indexed sender, uint256 amount);
    event Execute(address indexed sender, uint256 amount);
    event Released(uint256 amount);

    constructor(address _fundingContract, uint256 _threshold, uint256 _deadline) {
        fundingContract = ExampleExternalContract(_fundingContract);

        threshold = _threshold > 0 ? _threshold : 1 ether;
        deadline = _deadline > 0 && _deadline - block.timestamp > 60 ? _deadline : block.timestamp + 1 weeks;
    }

    //------------------ Main functions ------------------//
    // Allow anyone to stake Ether to the contract
    function stake() public payable {
        // require(!deadlineReached(), "Deadline reached");
        require(notCompleted(), "Already completed");

        balances[msg.sender] += msg.value;
        emit Stake(msg.sender, msg.value);
    }

    // After some `deadline` allow anyone to call an `execute()` function
    // If the deadline has passed and the threshold is met, it should call `exampleExternalContract.complete{value: address(this).balance}()`
    function execute() public {
        require(notCompleted(), "Already completed");

        require(deadlineReached(), "Deadline not reached");
        require(thresholdReached(), "Not enough staked");

        uint256 total = address(this).balance;
        fundingContract.complete{value: total}();
        emit Execute(msg.sender, total);
    }

    // If the `threshold` was not met, allow everyone to call a `withdraw()` function to withdraw their balance
    function withdraw() public {
        require(deadlineReached(), "Deadline not reached");
        require(!thresholdReached(), "Threshold reached");

        uint256 amount = balances[msg.sender];
        balances[msg.sender] = 0;

        (bool sent, bytes memory data) = payable(msg.sender).call{value: amount}("");
        require(sent, "Failed to send Ether");

        emit Withdraw(msg.sender, amount);
    }

    //------------------ Helper functions ------------------//
    // Add a `timeLeft()` view function that returns the time left before the deadline for the frontend
    function timeLeft() public view returns (uint256) {
        if (block.timestamp >= deadline) return 0;
        return deadline - block.timestamp;
    }

    function thresholdReached() public view returns (bool) {
        return address(this).balance >= threshold || fundingContract.completed();
    }

    function deadlineReached() public view returns (bool) {
        return timeLeft() == 0;
    }

    function notCompleted() public view returns (bool) {
        return !fundingContract.completed();
    }

    // ------------------ Fallback function ------------------ //
    // Add the `receive()` special function that receives eth and calls stake()
    receive() external payable {
        stake();
    }
}
