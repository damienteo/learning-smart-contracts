// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract MultiSend {
    address private owner;

    uint256 total_value;

    event OwnerSet(address indexed oldOwner, address indexed newOwner);

    modifier isOwner() {
        require(msg.sender == owner, "Caller is not owner");
        _;
    }

    constructor() payable {
        owner = msg.sender;
        emit OwnerSet(address(0), owner);

        total_value = msg.value;
    }

    function changeOwner(address newOwner) public isOwner {
        emit OwnerSet(owner, newOwner);
        owner = newOwner;
    }

    function getOwner() external view returns (address) {
        return owner;
    }

    function charge() public payable isOwner {
        total_value += msg.value;
    }

    function sum(uint256[] memory amounts)
        private
        pure
        returns (uint256 retVal)
    {
        uint256 totalAmnt = 0;

        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmnt += amounts[i];
        }

        return totalAmnt;
    }

    function withdraw(address payable receiverAddr, uint256 receiverAmt)
        private
    {
        receiverAddr.transfer(receiverAmt);
    }

    function withdrawals(address payable[] memory addrs, uint256[] memory amnts)
        public
        payable
        isOwner
    {
        total_value += msg.value;

        require(
            addrs.length == amnts.length,
            "the length of both arrays shouls be the same"
        );

        uint256 totalAmnt = sum(amnts);

        require(total_value >= totalAmnt, "Insufficient Value");

        for (uint256 i; i < addrs.length; i++) {
            total_value -= amnts[i];

            withdraw(addrs[i], amnts[i]);
        }
    }
}
