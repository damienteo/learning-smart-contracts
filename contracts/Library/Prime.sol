// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

library Prime {
    function dividesEvenly(uint256 a, uint256 b) public pure returns (bool) {
        return a % b == 0;
    }

    function isPrime(uint256 number) public pure returns (bool) {
        for (uint256 i = 2; i <= number / 2; i++) {
            if (dividesEvenly(number, i)) {
                return false;
            }
        }
        return true;
    }
}
