// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.17;

// This is the interface for an ERC-721 compliant non-fungible token
interface ERC721 {
    function balanceOf(address _owner) external view returns (uint256);

    function ownerOf(uint256 _tokenId) external view returns (address);

    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _tokenId
    ) external payable;

    function approve(address _approved, uint256 _tokenId) external;
}

// This is the contract for our NFT marketplace
contract MarketPlaceWithRoyalties {
    // This is the address of the contract that manages the NFTs
    ERC721 nftContract;

    // This is the mapping that stores the details of the NFTs that are for sale
    mapping(uint256 => NFT) public nftsForSale;

    // This is the event that is emitted when an NFT is sold
    event NFTSold(uint256 tokenId, address seller, address buyer);

    // This is the constructor function that is called when the contract is deployed
    constructor(address _nftContract) {
        nftContract = ERC721(_nftContract);
    }

    // This is the struct that represents an NFT
    struct NFT {
        uint256 tokenId;
        address seller;
        address creator;
        uint256 price;
        uint256 royalty;
    }

    // This function allows a seller to put an NFT up for sale
    function putNFTForSale(
        uint256 _tokenId,
        address _creator,
        uint256 _price,
        uint256 _royalty
    ) public {
        require(
            nftContract.ownerOf(_tokenId) == msg.sender,
            "Only the owner of the NFT can put it up for sale"
        );
        require(_price > 0, "The price must be greater than 0");
        require(
            _royalty >= 0 && _royalty <= 100,
            "The royalty must be between 0 and 100"
        );

        nftsForSale[_tokenId] = NFT(
            _tokenId,
            msg.sender,
            _creator,
            _price,
            _royalty
        );
    }

    // This function allows a buyer to purchase an NFT that is for sale
    function buyNFT(uint256 _tokenId) public payable {
        NFT storage nft = nftsForSale[_tokenId];
        require(nft.tokenId == _tokenId, "NFT is not for sale");
        require(msg.value == nft.price, "Incorrect price");

        delete nftsForSale[_tokenId];
        nftContract.safeTransferFrom(nft.seller, msg.sender, _tokenId);

        uint256 royaltyAmount = (nft.price * nft.royalty) / 100;
        (bool sent, ) = nft.creator.call{value: royaltyAmount}("");
        require(sent, "Failed to send Ether");

        emit NFTSold(_tokenId, nft.seller, msg.sender);
    }
}
