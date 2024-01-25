pragma solidity ^0.8.4; //Do not change the solidity version as it negativly impacts submission grading
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract YourToken is ERC20 {
    uint256 public constant INITIAL_SUPPLY = 2000 ether;

    constructor() ERC20("Diamond", "DMD") {
        _mint(_msgSender(), INITIAL_SUPPLY);
    }
}
