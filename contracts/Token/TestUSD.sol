// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TestUSD is ERC20, Ownable {
    constructor() ERC20("TestUSD", "TUSD") {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    // https://www.reddit.com/r/USDC/comments/jobvrz/is_the_decimal_of_usdc_18_or_6/
    function decimals() public view virtual override returns (uint8) {
        return 6;
    }
}
