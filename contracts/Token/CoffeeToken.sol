//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CoffeeToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    event CoffeeBurnt(address indexed receiver, address indexed buyer);

    constructor() ERC20("CoffeeToken", "CFE") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount * 10**decimals());
    }

    function buyOneCoffee() public {
        _burn(_msgSender(), 1 * 10**decimals());
        emit CoffeeBurnt(_msgSender(), _msgSender());
    }

    function buyOneCoffeeFrom(address account) public {
        _spendAllowance(account, _msgSender(), 1 * 10**decimals());
        _burn(account, 1 * 10**decimals());

        emit CoffeeBurnt(_msgSender(), account);
    }
}
