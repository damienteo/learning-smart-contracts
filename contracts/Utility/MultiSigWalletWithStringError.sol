// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "hardhat/console.sol";

// Source: https://solidity-by-example.org/app/multi-sig-wallet/

contract MultiSigWalletWithStringError {
    event Deposit(address indexed sender, uint256 amount, uint256 balance);
    event SubmitTransaction(
        address indexed owner,
        uint256 indexed txIndex,
        address indexed to,
        uint256 value,
        bytes data
    );
    event ConfirmTransaction(address indexed owner, uint256 indexed txIndex);
    event RevokeConfirmation(address indexed owner, uint256 indexed txIndex);
    event ExecuteTransaction(address indexed owner, uint256 indexed txIndex);

    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public numConfirmationsRequired;

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 numConfirmations;
    }

    // mapping from tx index => owner => bool
    mapping(uint256 => mapping(address => bool)) public isConfirmed;

    Transaction[] public transactions;

    modifier onlyOwner() {
        require(isOwner[msg.sender], "NOT_OWNER");
        _;
    }

    modifier txExists(uint256 _txIndex) {
        require(_txIndex < transactions.length, "TX_DOES_NOT_EXIST");
        _;
    }

    modifier notExecuted(uint256 _txIndex) {
        require(!transactions[_txIndex].executed, "TX_ALREADY_EXECUTED");
        _;
    }

    modifier notConfirmed(uint256 _txIndex) {
        require(!isConfirmed[_txIndex][msg.sender], "TX_ALREADY_CONFIRMED");
        _;
    }

    constructor(address[] memory _owners, uint256 _numConfirmationsRequired) {
        require(_owners.length > 0, "OWNER_REQUIRED");

        require(
            _numConfirmationsRequired > 0 &&
                _numConfirmationsRequired <= _owners.length,
            "INVALID_NUMBER_OF_REQUIRED_CONFIRMATIONS"
        );

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];

            require(owner != address(0), "INVALID_OWNER");

            require(!isOwner[owner], "OWNER_NOT_UNIQUE");

            isOwner[owner] = true;
            owners.push(owner);
        }

        numConfirmationsRequired = _numConfirmationsRequired;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    function submitTransaction(
        address _to,
        uint256 _value,
        bytes memory _data
    ) public onlyOwner {
        uint256 txIndex = transactions.length;

        transactions.push(
            Transaction({
                to: _to,
                value: _value,
                data: _data,
                executed: false,
                numConfirmations: 0
            })
        );

        emit SubmitTransaction(msg.sender, txIndex, _to, _value, _data);
    }

    function confirmTransaction(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
        notConfirmed(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations += 1;
        isConfirmed[_txIndex][msg.sender] = true;

        emit ConfirmTransaction(msg.sender, _txIndex);
    }

    function executeTransaction(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
        returns (bytes memory)
    {
        Transaction storage transaction = transactions[_txIndex];

        require(
            transaction.numConfirmations >= numConfirmationsRequired,
            "CANNOT_EXECUTE_TX"
        );

        transaction.executed = true;

        (bool success, bytes memory returnData) = transaction.to.call{
            value: transaction.value
        }(transaction.data);
        require(success, "TX_FAILURE");

        emit ExecuteTransaction(msg.sender, _txIndex);

        return returnData;
    }

    function revokeConfirmation(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];

        require(isConfirmed[_txIndex][msg.sender], "TX_NOT_CONFIRMED");

        transaction.numConfirmations -= 1;
        isConfirmed[_txIndex][msg.sender] = false;

        emit RevokeConfirmation(msg.sender, _txIndex);
    }

    function getOwners() public view returns (address[] memory) {
        return owners;
    }

    function getTransactionCount() public view returns (uint256) {
        return transactions.length;
    }

    function getTransaction(uint256 _txIndex)
        public
        view
        returns (
            address to,
            uint256 value,
            bytes memory data,
            bool executed,
            uint256 numConfirmations
        )
    {
        Transaction storage transaction = transactions[_txIndex];

        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numConfirmations
        );
    }
}

// Gas Reporter with String Errors
// ·--------------------------------------------------------|----------------------------|-------------|-----------------------------·
// |                  Solc version: 0.8.17                  ·  Optimizer enabled: false  ·  Runs: 200  ·  Block limit: 30000000 gas  │
// ·························································|····························|·············|······························
// |  Methods                                                                                                                        │
// ··································|······················|··············|·············|·············|···············|··············
// |  Contract                       ·  Method              ·  Min         ·  Max        ·  Avg        ·  # calls      ·  usd (avg)  │
// ··································|······················|··············|·············|·············|···············|··············
// |  MultiSigWalletWithStringError  ·  confirmTransaction  ·       58003  ·      75115  ·      66883  ·           52  ·          -  │
// ··································|······················|··············|·············|·············|···············|··············
// |  MultiSigWalletWithStringError  ·  executeTransaction  ·       91728  ·     125742  ·     102196  ·           13  ·          -  │
// ··································|······················|··············|·············|·············|···············|··············
// |  MultiSigWalletWithStringError  ·  revokeConfirmation  ·           -  ·          -  ·      32700  ·            6  ·          -  │
// ··································|······················|··············|·············|·············|···············|··············
// |  MultiSigWalletWithStringError  ·  submitTransaction   ·      131095  ·     726432  ·     261705  ·           40  ·          -  │
// ··································|······················|··············|·············|·············|···············|··············
// |  Deployments                                           ·                                          ·  % of limit   ·             │
// ·························································|··············|·············|·············|···············|··············
// |  MultiSigWalletWithStringError                         ·           -  ·          -  ·    2042741  ·        6.8 %  ·          -  │
// ·························································|··············|·············|·············|···············|··············
// |  TestContract                                          ·           -  ·          -  ·     233294  ·        0.8 %  ·          -  │
// ·--------------------------------------------------------|--------------|-------------|-------------|---------------|-------------·

// Gas Reporter with Custom Errors
// ·-----------------------------------------|----------------------------|-------------|-----------------------------·
// |          Solc version: 0.8.17           ·  Optimizer enabled: false  ·  Runs: 200  ·  Block limit: 30000000 gas  │
// ··········································|····························|·············|······························
// |  Methods                                                                                                         │
// ···················|······················|··············|·············|·············|···············|··············
// |  Contract        ·  Method              ·  Min         ·  Max        ·  Avg        ·  # calls      ·  usd (avg)  │
// ···················|······················|··············|·············|·············|···············|··············
// |  MultiSigWallet  ·  confirmTransaction  ·       58003  ·      75115  ·      66883  ·           52  ·          -  │
// ···················|······················|··············|·············|·············|···············|··············
// |  MultiSigWallet  ·  executeTransaction  ·       91728  ·     125742  ·     102196  ·           13  ·          -  │
// ···················|······················|··············|·············|·············|···············|··············
// |  MultiSigWallet  ·  revokeConfirmation  ·           -  ·          -  ·      32700  ·            6  ·          -  │
// ···················|······················|··············|·············|·············|···············|··············
// |  MultiSigWallet  ·  submitTransaction   ·      131095  ·     726432  ·     261705  ·           40  ·          -  │
// ···················|······················|··············|·············|·············|···············|··············
// |  Deployments                            ·                                          ·  % of limit   ·             │
// ··········································|··············|·············|·············|···············|··············
// |  MultiSigWallet                         ·           -  ·          -  ·    1842735  ·        6.1 %  ·          -  │
// ··········································|··············|·············|·············|···············|··············
// |  TestContract                           ·           -  ·          -  ·     233294  ·        0.8 %  ·          -  │
// ·-----------------------------------------|--------------|-------------|-------------|---------------|-------------·
