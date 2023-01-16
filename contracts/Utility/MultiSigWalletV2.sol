// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

// import "hardhat/console.sol";

error NotOwner();
error NotMultiSig();

error TxDoesNotExist();
error TxAlreadyExecuted();
error TxAlreadyConfirmed();

error OwnersRequired();
error InvalidRequiredConfirmations();

error InvalidOwner();
error OwnerNotUnique();

error NotEnoughConfirmations();
error TxFailure();
error TxNotConfirmed();

contract MultiSigWalletV2 {
    /*
     *  Events
     */

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

    event OwnerAddition(address indexed owner);
    event OwnerRemoval(address indexed owner);
    event RequirementChange(uint256 required);

    /*
     *  Storage
     */

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

    /*
     *  Modifiers
     */
    modifier onlyMultiSig() {
        if (msg.sender != address(this)) revert NotMultiSig();
        _;
    }

    // ownerDoesNotExist and ownerExists do not require custom errors
    // As they can only be called indirectly via the multisig address
    // Only TxFailure() will get returned upon failure
    modifier ownerDoesNotExist(address owner) {
        require(!isOwner[owner]);
        _;
    }

    modifier ownerExists(address owner) {
        require(isOwner[owner]);
        _;
    }

    modifier notNull(address _address) {
        if (_address == address(0)) revert InvalidOwner();
        _;
    }

    modifier onlyOwner() {
        if (!isOwner[msg.sender]) revert NotOwner();
        _;
    }

    modifier txExists(uint256 _txIndex) {
        if (!(_txIndex < transactions.length)) revert TxDoesNotExist();
        _;
    }

    modifier notExecuted(uint256 _txIndex) {
        if (transactions[_txIndex].executed) revert TxAlreadyExecuted();
        _;
    }

    modifier notConfirmed(uint256 _txIndex) {
        if (isConfirmed[_txIndex][msg.sender]) revert TxAlreadyConfirmed();
        _;
    }

    /*
     * Public functions
     */

    constructor(address[] memory _owners, uint256 _numConfirmationsRequired) {
        if (_owners.length == 0) revert OwnersRequired();

        if (
            _numConfirmationsRequired == 0 ||
            _numConfirmationsRequired >= _owners.length
        ) revert InvalidRequiredConfirmations();

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];

            if (owner == address(0)) revert InvalidOwner();

            if (isOwner[owner]) revert OwnerNotUnique();

            isOwner[owner] = true;
            owners.push(owner);
        }

        numConfirmationsRequired = _numConfirmationsRequired;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    function addOwner(address owner)
        public
        onlyMultiSig
        ownerDoesNotExist(owner)
        notNull(owner)
    {
        isOwner[owner] = true;
        owners.push(owner);
        emit OwnerAddition(owner);
    }

    function removeOwner(address owner) public onlyMultiSig ownerExists(owner) {
        isOwner[owner] = false;

        for (uint256 i = 0; i < owners.length - 1; i++) {
            if (owners[i] == owner) {
                owners[i] = owners[owners.length - 1];
                break;
            }
        }

        owners.pop();

        if (numConfirmationsRequired > owners.length) {
            changeRequirement(owners.length);
        }

        emit OwnerRemoval(owner);
    }

    function replaceOwner(address owner, address nextOwner)
        public
        onlyMultiSig
        ownerExists(owner)
        ownerDoesNotExist(nextOwner)
        notNull(nextOwner)
    {
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == owner) {
                owners[i] = nextOwner;
                break;
            }
        }

        isOwner[owner] = false;
        isOwner[nextOwner] = true;

        emit OwnerRemoval(owner);
        emit OwnerAddition(nextOwner);
    }

    function changeRequirement(uint256 _required) public onlyMultiSig {
        require(_required <= owners.length);
        numConfirmationsRequired = _required;
        emit RequirementChange(_required);
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

        if (transaction.numConfirmations < numConfirmationsRequired)
            revert NotEnoughConfirmations();

        transaction.executed = true;

        (bool success, bytes memory returnData) = transaction.to.call{
            value: transaction.value
        }(transaction.data);

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
