// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BasicERC20Token is ERC20, Ownable {
    constructor(uint256 amount) ERC20("BasicERC20Token", "BET") {
        _mint(msg.sender, amount * 10**decimals());
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount * 10**decimals());
    }

    function burn(uint256 amount) public {
        _burn(msg.sender, amount * 10**decimals());
    }
}
