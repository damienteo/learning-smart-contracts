// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract DynamicNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    // Metadata information for each stage of the NFT on IPFS.
    string[] IpfsUri = [
        "https://bafkreicxerjedfae7jnvcnwzstiklowhijjyf4hu2gw2qtyznxjtzi4uve.ipfs.nftstorage.link",
        "https://bafkreigyzkba5myht24jwxw3wko2vejvjfzlgzaoyionztzek7wyvhrj2e.ipfs.nftstorage.link"
    ];

    uint256 interval;
    uint256 lastTimeStamp;

    constructor(uint256 _interval) ERC721("dNFTs", "dNFT") {
        interval = _interval;
        lastTimeStamp = block.timestamp;
    }

    function safeMint(address to) public onlyOwner {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, IpfsUri[0]);
    }

    function nftStage(uint _tokenId) public view returns (uint256) {
        string memory _uri = tokenURI(_tokenId);

        if (compareStrings((_uri), IpfsUri[0])) {
            return 0;
        }
        return 1;
    }

    function evolveNFT(uint256 _tokenId) public {
        if (nftStage(_tokenId) >= 1) {
            return;
        }

        uint256 newStage = nftStage(_tokenId) + 1;
        string memory newURI = IpfsUri[newStage];
        _setTokenURI(_tokenId, newURI);
    }

    function checkUpkeep(
        bytes calldata
    ) external view returns (bool upkeepNeeded, bytes memory) {
        upkeepNeeded = (block.timestamp - lastTimeStamp) > interval;
    }

    function performUpkeep(bytes calldata) external {
        if ((block.timestamp - lastTimeStamp) > interval) {
            lastTimeStamp = block.timestamp;
            evolveNFT(0);
        }
    }

    /*
     ********************
     * HELPER FUNCTIONS *
     ********************
     */

    //Helper Function to compare Strings
    function compareStrings(
        string memory a,
        string memory b
    ) public pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) ==
            keccak256(abi.encodePacked((b))));
    }

    //Overrides required by Solidity
    function _burn(
        uint256 tokenId
    ) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
