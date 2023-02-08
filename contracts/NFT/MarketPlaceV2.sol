pragma solidity ^0.8.0;

interface ERC20 {
    function transfer(address _to, uint256 _value) external returns (bool);

    function balanceOf(address _owner) external view returns (uint256);
}

interface ERC721 {
    function transferFrom(
        address _from,
        address _to,
        uint256 _tokenId
    ) external returns (bool);

    function ownerOf(uint256 _tokenId) external view returns (address);
}

contract MarketPlace {
    // ERC-721 token contract address
    address public nftContractAddress;

    // ERC-20 token contract address
    address public erc20ContractAddress;

    // Mapping to store offers
    mapping(uint256 => Offer) public offers;

    // Event to log successful trades
    event Trade(
        address indexed from,
        address indexed to,
        uint256 nftId,
        uint256 value
    );

    // Offer struct to store the details of each offer
    struct Offer {
        uint256 nftId;
        uint256 value;
        address owner;
        bool available;
    }

    constructor(address _nftContractAddress, address _erc20ContractAddress)
        public
    {
        nftContractAddress = _nftContractAddress;
        erc20ContractAddress = _erc20ContractAddress;
    }

    // Function to make an offer to trade an ERC-721 token for an ERC-20 token
    function makeOffer(uint256 _nftId, uint256 _value) public {
        // Check if the caller owns the ERC-721 token
        require(
            ERC721(nftContractAddress).ownerOf(_nftId) == msg.sender,
            "You do not own the ERC-721 token"
        );

        // Check if the offer with the same nftId already exists
        require(
            offers[_nftId].available == false,
            "An offer with the same NFT id already exists"
        );

        // Add the offer to the mapping
        offers[_nftId].nftId = _nftId;
        offers[_nftId].value = _value;
        offers[_nftId].owner = msg.sender;
        offers[_nftId].available = true;
    }

    // Function to accept an offer and trade an ERC-721 token for an ERC-20 token
    function acceptOffer(uint256 _nftId) public payable {
        // Check if the offer with the nftId exists
        require(offers[_nftId].available == true, "Offer does not exist");

        // Check if the caller has enough ERC-20 tokens
        require(
            msg.value >= offers[_nftId].value,
            "You do not have enough ERC-20 tokens"
        );

        // Transfer the ERC-20 tokens from the caller to the offer owner
        require(
            ERC20(erc20ContractAddress).transfer(
                offers[_nftId].owner,
                msg.value
            ),
            "ERC-20 transfer failed"
        );

        // Transfer the ERC-721 token from the offer owner to the caller
        require(
            ERC721(nftContractAddress).transferFrom(
                msg.sender,
                offers[_nftId].owner,
                _nftId
            ),
            "ERC-721 transfer failed"
        );

        // Emit the Trade event
        emit Trade(msg.sender, offers[_nftId].owner, _nftId, msg.value);

        // Set the offer as unavailable
        offers[_nftId].available = false;
    }

    // Function to cancel an offer
    function cancelOffer(uint256 _nftId) public {
        // Check if the caller is the owner of the offer
        require(
            offers[_nftId].owner == msg.sender,
            "You are not the owner of the offer"
        );

        // Set the offer as unavailable
        offers[_nftId].available = false;
    }
}
