pragma solidity ^0.8.4; //Do not change the solidity version as it negativly impacts submission grading
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/access/Ownable.sol";
import "./YourToken.sol";

contract Vendor is Ownable {
    event BuyTokens(address buyer, uint256 amountOfETH, uint256 amountOfTokens);
    event SellTokens(address seller, uint256 amountOfTokens, uint256 amountOfETH);

    YourToken public yourToken;
    uint256 public constant TOKENS_PER_ETH = 100;

    constructor(address tokenAddress) {
        yourToken = YourToken(tokenAddress);
    }

    // ToDo: create a payable buyTokens() function:
    function buyTokens() public payable {
        uint256 amountOfTokens = msg.value * TOKENS_PER_ETH;
        yourToken.transfer(msg.sender, amountOfTokens);

        emit BuyTokens(msg.sender, msg.value, amountOfTokens);
    }

    // ToDo: create a withdraw() function that lets the owner withdraw ETH
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(msg.sender).transfer(balance);
    }

    // ToDo: create a sellTokens(uint256 _amount) function:
    function sellTokens(uint256 _amount) public {
        uint256 amountOfETH = _amount / TOKENS_PER_ETH;
        yourToken.transferFrom(msg.sender, address(this), _amount);
        payable(msg.sender).transfer(amountOfETH);

        emit SellTokens(msg.sender, _amount, amountOfETH);
    }
}
