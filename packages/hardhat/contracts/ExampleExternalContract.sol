// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

interface ExampleExternalContract {
    function complete() external payable;
    function withdraw() external;

    function completed() external view returns (bool);
}
