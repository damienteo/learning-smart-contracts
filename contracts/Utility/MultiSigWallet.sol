// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "hardhat/console.sol";

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

        // require(
        //     transaction.numConfirmations >= numConfirmationsRequired,
        //     "CANNOT_EXECUTE_TX"
        // );
        if (transaction.numConfirmations < numConfirmationsRequired)
            revert NotEnoughConfirmations();

        transaction.executed = true;

        (bool success, bytes memory returnData) = transaction.to.call{
            value: transaction.value
        }(transaction.data);
        // require(success, "TX_FAILURE");
        if (!success) revert TxFailure();

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

// Three ways of generating a contract that will be owned by the multisig contract:
// 1) Another wallet creates the contract and transfers ownership to the multisig contract (cheapest and least complicated)
// 2) Using executeTransaction, wherein `_to` is a zero address, so a new contract will be deployed, while `data` is the bytecode of the new contract to be deployed
// 3) Alternative way fo executeTransaction, which is:
// `
//  assembly {
//             newContract := create(value, add(deploymentData, 0x20), mload(deploymentData))
//         }
// `

// The create function takes three arguments: a value, a data offset, and a data size.
// Itn returns the address of the newly created contract as its output.
// value is the amount of ether that will be passed to the contract when it is created.
// The add(_data, 0x20) expression calculates the memory address of the contract bytecode
// by adding the _data argument (which is a bytes memory variable containing the contract bytecode) to the hexadecimal number 0x20.
// The reason for adding 0x20 to the _data argument is that
// Solidity uses a so-called "free memory pointer" to keep track of where the next memory allocation should occur.
// When you allocate memory in Solidity using the malloc function or the new keyword,
// the free memory pointer is incremented by the number of bytes you allocate.

// For example, if you allocate 32 bytes of memory using malloc(32),
// the free memory pointer will be incremented by 32
// and will point to the memory address immediately after the allocated memory.
// If you then allocate another 32 bytes of memory using malloc(32),
// the free memory pointer will be incremented by another 32 and
// will point to the memory address immediately after the second allocated memory block.

// The create function uses the free memory pointer to determine where to store the contract bytecode.
// By adding 0x20 to the _data argument,
// you are effectively "reserving" 32 bytes of memory for the contract bytecode and
// ensuring that the free memory pointer points to the memory address immediately after the contract bytecode.

// The mload(_data) expression is used to calculate the data size, or the length of the contract bytecode.
// It does this by using the mload function to load the value at the memory address specified by the _data argument
// (which is a bytes memory variable containing the contract bytecode).

// The mload function loads a word (i.e. 32 bytes) from memory and returns it as a uint256 value.
// In this case, the mload function is used to load the first 32 bytes of the contract bytecode,
// which contains the length of the bytecode stored as a uint256 value.

// By using the mload function to calculate the data size,
// you can ensure that the entire contract bytecode is included in the create function call.

// The `call` function is a low-level function that allows you to execute a contract's fallback function with a given value and data.
// If the contract address specified in the _to argument is set to address(0),
// the call function will create a new contract at the address of the call
// and execute its fallback function with the given _value and _data arguments.

// The main difference is that:
// the create function allows you to specify a value to send to the contract when it is created,
// while the call function allows you to execute the contract's fallback function with a given value and data.

// Other factors:
// Compatibility: The call function is available in all versions of Solidity,
// while the create function is only available in version 0.4.0 and higher.
// Gas cost: The gas cost of the create function is generally lower
// than the gas cost of the call function,
// since it does not execute the contract's fallback function.
// However, the create function has a higher upfront cost,
// as it requires you to specify a value to send to the contract when it is created.
// Use case: If you just want to deploy a new contract without executing any of its functions,
// the create function may be a more efficient choice.
// If you want to execute the contract's fallback function or any other function as part of the deployment process,
// the call function may be a better choice.

// https://medium.com/coinmonks/the-difference-between-bytecode-and-deployed-bytecode-64594db723df
