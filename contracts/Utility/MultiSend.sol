// Ref: https://medium.com/coinmonks/implement-multi-send-on-ethereum-by-smart-contract-with-solidity-47e0bf82b60c
// Ref: https://github.com/encoderafat/disperse/blob/main/truffle/contracts/disperse.sol
// Ref: https://github.com/banteg/disperse-research/blob/master/contracts/Disperse.sol
// FIXME: This is just a very basic ideation draft

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);
}

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

    function withdrawNetworkToken(
        address payable receiverAddr,
        uint256 receiverAmt
    ) private {
        receiverAddr.transfer(receiverAmt);
    }

    function disperseNetworkTokens(
        address payable[] memory addrs,
        uint256[] memory amnts
    ) public payable isOwner {
        total_value += msg.value;

        require(
            addrs.length == amnts.length,
            "the length of both arrays shouls be the same"
        );

        uint256 totalAmnt = sum(amnts);

        require(total_value >= totalAmnt, "Insufficient Value");

        for (uint256 i; i < addrs.length; i++) {
            total_value -= amnts[i];

            withdrawNetworkToken(addrs[i], amnts[i]);
        }
    }

    function disperseEther(
        address payable[] calldata recipients,
        uint256[] calldata values
    ) external payable {
        for (uint256 i; i < recipients.length; i++) {
            recipients[i].transfer(values[i]);
        }

        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    function disperseToken(
        IERC20 token,
        address[] calldata recipients,
        uint256[] calldata values
    ) external {
        uint256 total = 0;
        for (uint256 i; i < recipients.length; i++) {
            total += values[i];
        }

        require(token.transferFrom(msg.sender, address(this), total));

        for (uint256 i; i < recipients.length; i++) {
            require(token.transfer(recipients[i], values[i]));
        }
    }

    function disperseTokenSimple(
        IERC20 token,
        address[] calldata recipients,
        uint256[] calldata values
    ) external {
        for (uint256 i; i < recipients.length; i++) {
            require(token.transferFrom(msg.sender, recipients[i], values[i]));
        }
    }
}
