//SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

interface INewERC20Token {
    function mint(address to, uint256 amount) external;
}

contract NewTokenSale {
    /// Purchase ratio between ERC20 Token and Eth
    uint256 public ratio;
    INewERC20Token public paymentToken;

    constructor(uint256 _ratio, address _paymentToken) {
        ratio = _ratio;
        paymentToken = INewERC20Token(_paymentToken);
    }

    function purchaseTokens() public payable {
        uint256 etherReceived = msg.value;
        uint256 tokensToBeEarned = etherReceived / ratio;

        paymentToken.mint(msg.sender, tokensToBeEarned);
    }
}
