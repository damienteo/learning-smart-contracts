// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract BiDirectionalPaymentChannel {
    using ECDSA for bytes32;

    event ChallengeExit(address indexed sender, uint256 nonce);
    event Withdraw(address indexed to, uint256 amount);

    address payable[2] public users;
    mapping(address => bool) public isUser;

    mapping(address => uint256) public balances;

    uint256 public challengePeriod;
    uint256 public expiresAt;
    uint256 public nonce;

    modifier checkBalances(uint256[2] memory _balances) {
        require(
            address(this).balance >= _balances[0] + _balances[1],
            "INSUFFICIENT_BALANCE"
        );

        _;
    }

    constructor(
        address payable[2] memory _users,
        uint256[2] memory _balances,
        uint256 _expiresAt,
        uint256 _challengePeriod
    ) payable checkBalances(_balances) {
        require(_expiresAt > block.timestamp, "INVALID_EXPIRATION");
        require(_challengePeriod > 0, "INVALID_CHALLENGE_PERIOD");

        for (uint256 i = 0; i < _users.length; i++) {
            address payable user = _users[i];
            require(!isUser[user], "NON_UNIQUE_USER");
            users[i] = user;
            isUser[user] = true;
            balances[user] = _balances[i];
        }

        expiresAt = _expiresAt;
        challengePeriod = _challengePeriod;
    }

    function verify(
        bytes[2] memory _signatures,
        address _contract,
        address[2] memory _signers,
        uint256[2] memory _balances,
        uint256 _nonce
    ) public pure returns (bool) {
        for (uint256 i = 0; i < _signatures.length; i++) {
            bool valid = _signers[i] ==
                keccak256(abi.encodePacked(_contract, _balances, _nonce))
                    .toEthSignedMessageHash()
                    .recover(_signatures[i]);

            if (!valid) {
                return false;
            }
        }
        return true;
    }

    modifier checkSignatures(
        bytes[2] memory _signatures,
        uint256[2] memory _balances,
        uint256 _nonce
    ) {
        address[2] memory signers;
        for (uint256 i = 0; i < users.length; i++) {
            signers[i] = users[i];
        }

        require(
            verify(_signatures, address(this), signers, _balances, _nonce),
            "INVALID_SIGNATURE"
        );

        _;
    }

    modifier onlyUser() {
        require(isUser[msg.sender], "NOT_USER");

        _;
    }

    function challengeExit(
        uint256[2] memory _balances,
        uint256 _nonce,
        bytes[2] memory _signatures
    )
        public
        onlyUser
        checkSignatures(_signatures, _balances, _nonce)
        checkBalances(_balances)
    {
        require(block.timestamp < expiresAt, "EXPIRED");
        require(_nonce > nonce, "INVALID_NONCE");

        for (uint256 i = 0; i < _balances.length; i++) {
            balances[users[i]] = _balances[i];
        }

        nonce = _nonce;
        expiresAt = block.timestamp + challengePeriod;

        emit ChallengeExit(msg.sender, nonce);
    }

    function withdraw() public onlyUser {
        require(block.timestamp >= expiresAt, "UN_EXPIRED");

        uint256 amount = balances[msg.sender];
        balances[msg.sender] = 0;

        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "FAILED_TO_SEND");

        emit Withdraw(msg.sender, amount);
    }
}
