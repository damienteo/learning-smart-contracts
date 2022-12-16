// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

// import "hardhat/console.sol";

// Source: https://solidity-by-example.org/app/multi-sig-wallet/

// Note on Custom Errors: https://blog.soliditylang.org/2021/04/21/custom-errors/
error NotOwner();
error TxDoesNotExist();
error TxAlreadyExecuted();
error TxAlreadyConfirmed();

error OwnersRequired();
error InvalidNumberOfRequiredConfirmations();

error InvalidOwner();
error OwnerNotUnique();

error NotEnoughConfirmations();
error TxFailure();
error TxNotConfirmed();

contract MultiSigWallet {
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
        // require(isOwner[msg.sender], "NOT_OWNER");
        if (!isOwner[msg.sender]) revert NotOwner();
        _;
    }

    modifier txExists(uint256 _txIndex) {
        // require(_txIndex < transactions.length, "TX_DOES_NOT_EXIST");
        if (!(_txIndex < transactions.length)) revert TxDoesNotExist();
        _;
    }

    modifier notExecuted(uint256 _txIndex) {
        // require(!transactions[_txIndex].executed, "TX_ALREADY_EXECUTED");
        if (transactions[_txIndex].executed) revert TxAlreadyExecuted();
        _;
    }

    modifier notConfirmed(uint256 _txIndex) {
        // require(!isConfirmed[_txIndex][msg.sender], "TX_ALREADY_CONFIRMED");
        if (isConfirmed[_txIndex][msg.sender]) revert TxAlreadyConfirmed();
        _;
    }

    constructor(address[] memory _owners, uint256 _numConfirmationsRequired) {
        // require(_owners.length > 0, "OWNER_REQUIRED");
        if (_owners.length == 0) revert OwnersRequired();

        // require(
        //     _numConfirmationsRequired > 0 &&
        //         _numConfirmationsRequired <= owners.length,
        //     "INVALID_NUMBER_OF_REQUIRED_CONFIRMATIONS"
        // );
        if (
            _numConfirmationsRequired == 0 ||
            _numConfirmationsRequired >= _owners.length
        ) revert InvalidNumberOfRequiredConfirmations();

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];

            // require(owner != address(0), "INVALID_OWNER");
            if (owner == address(0)) revert InvalidOwner();

            // require(!isOwner[owner], "OWNER_NOT_UNIQUE");
            if (isOwner[owner]) revert OwnerNotUnique();

            isOwner[owner] = true;
            owners.push(owner);
        }
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
    {
        Transaction storage transaction = transactions[_txIndex];

        // require(
        //     transaction.numConfirmations >= numConfirmationsRequired,
        //     "CANNOT_EXECUTE_TX"
        // );
        if (transaction.numConfirmations < numConfirmationsRequired)
            revert NotEnoughConfirmations();

        transaction.executed = true;

        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );
        // require(success, "TX_FAILURE");
        if (!success) revert TxFailure();

        emit ExecuteTransaction(msg.sender, _txIndex);
    }

    function revokeConfirmation(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];

        // require(isConfirmed[_txIndex][msg.sender], "TX_NOT_CONFIRMED");
        if (!isConfirmed[_txIndex][msg.sender]) revert TxNotConfirmed();

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

// Possible Future Optimisations:

// Optimisation: pre-increment versus post-increment
// https://ethereum.stackexchange.com/questions/133161/why-does-i-cost-less-gas-than-i
// Does it affect reading from array?

// Setting _numConfirmationsRequired at the start? And setting it as immutable

// Gas optimisation when setting public versus private view

// Additional Add-ons
// Number of confirmations for deployment, upgrade, versus transfer of value)

// Multi Sig for deploying and upgrading contracts
