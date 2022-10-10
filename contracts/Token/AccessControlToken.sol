//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract AccessControlToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    // constructor(address minter, address burner)
    constructor() ERC20("AccessControlToken", "ACT") {
        // _setupRole(MINTER_ROLE, minter);
        // _setupRole(BURNER_ROLE, burner);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        // require(hasRole(MINTER_ROLE, msg.sender), "Caller is not a minter");
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) public onlyRole(BURNER_ROLE) {
        _burn(from, amount);
    }

    function setRoleAdmin(bytes32 role, bytes32 adminRole)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _setRoleAdmin(role, adminRole);
    }
}
