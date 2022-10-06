//SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface INewERC20Token is IERC20 {
    function mint(address to, uint256 amount) external;

    function burnFrom(address from, uint256 amount) external;
}

interface INewERC721Token is IERC721 {
    function safeMint(address to, uint256 amount) external;

    function burn(uint256 tokenId) external;
}

contract NewTokenSale is Ownable {
    /// Purchase ratio between ERC20 Token and Eth
    uint256 public ratio;
    uint256 public tokenPrice;
    INewERC20Token public paymentToken;
    INewERC721Token public nftContract;
    uint256 public adminPool; // amount reserved for users to withdraw
    uint256 public publicPool;

    constructor(
        uint256 _ratio,
        uint256 _tokenPrice,
        address _paymentToken,
        address _nftContract
    ) {
        ratio = _ratio;
        tokenPrice = _tokenPrice;
        paymentToken = INewERC20Token(_paymentToken);
        nftContract = INewERC721Token(_nftContract);
    }

    function purchaseTokens() public payable {
        uint256 etherReceived = msg.value;
        uint256 tokensToBeEarned = etherReceived / ratio;

        paymentToken.mint(msg.sender, tokensToBeEarned);
    }

    function burnTokens(uint256 amount) public {
        paymentToken.burnFrom(msg.sender, amount);
        uint256 ethToBeReturned = amount * ratio;
        payable(msg.sender).transfer(ethToBeReturned);
    }

    function purchaseNFT(uint256 tokenId) public {
        uint256 charge = tokenPrice / 2;

        adminPool += charge;
        publicPool += tokenPrice - charge;

        paymentToken.transferFrom(msg.sender, address(this), tokenPrice);
        nftContract.safeMint(msg.sender, tokenId);
    }

    function burnNFT(uint256 tokenId) public {
        nftContract.burn(tokenId);
        paymentToken.transfer(msg.sender, tokenPrice / 2);
    }

    function withdraw(uint256 amount) public onlyOwner {
        require(amount <= adminPool, "Amount less than available");
        adminPool -= amount;
        paymentToken.transfer(msg.sender, amount);
    }
}
