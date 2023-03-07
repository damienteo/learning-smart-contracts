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

error InvalidSignature();
error InvalidNonce();

contract MultiSigWalletV3 {
    /*
     *  Storage
     */

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 numConfirmations;
    }

    address[] public owners;
    mapping(address => bool) public isOwner;

    mapping(address => uint256) public nonces;

    uint256 public numConfirmationsRequired;
    mapping(uint256 => mapping(address => bool)) public isConfirmed; // mapping from tx index => owner => bool

    Transaction[] public transactions;

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

    modifier notConfirmedByAddress(uint256 _txIndex, address _owner) {
        if (isConfirmed[_txIndex][_owner]) revert TxAlreadyConfirmed();
        _;
    }

    modifier validNonceAndSignature(
        uint256 _nonce,
        uint256 _txIndex,
        address _owner,
        bytes calldata signature
    ) {
        if (_nonce != (nonces[_owner] + 1)) revert InvalidNonce();

        if (!verify(_nonce, _txIndex, _owner, signature))
            revert InvalidSignature();
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
        bytes calldata _data
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
        unchecked {
            transaction.numConfirmations += 1;
        }
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
        unchecked {
            transaction.numConfirmations -= 1;
        }
        isConfirmed[_txIndex][msg.sender] = false;

        emit RevokeConfirmation(msg.sender, _txIndex);
    }

    function confirmTransactionOnBehalf(
        uint256 _nonce,
        uint256 _txIndex,
        address _owner,
        bytes calldata signature
    )
        public
        txExists(_txIndex)
        notExecuted(_txIndex)
        ownerExists(_owner)
        notConfirmedByAddress(_txIndex, _owner)
        validNonceAndSignature(_nonce, _txIndex, _owner, signature)
    {
        Transaction storage transaction = transactions[_txIndex];
        unchecked {
            transaction.numConfirmations += 1;
            nonces[_owner] += 1;
        }
        isConfirmed[_txIndex][_owner] = true;

        emit ConfirmTransaction(_owner, _txIndex);
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

    function getMessageHash(
        uint256 _nonce,
        uint256 _txIndex,
        address _owner
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_nonce, _txIndex, _owner));
    }

    function getEthSignedMessageHash(bytes32 _messageHash)
        public
        pure
        returns (bytes32)
    {
        return
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n32",
                    _messageHash
                )
            );
    }

    function splitSignature(bytes memory sig)
        public
        pure
        returns (
            bytes32 r,
            bytes32 s,
            uint8 v
        )
    {
        require(sig.length == 65, "Invalid signature length");

        assembly {
            /*
            First 32 bytes stores the length of the signature

            add(sig, 32) = pointer of sig + 32
            effectively, skips first 32 bytes of signature

            mload(p) loads next 32 bytes starting at the memory address p into memory
            */

            // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
            // second 32 bytes
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }
    }

    function recoverSigner(
        bytes32 _ethSignedMessageHash,
        bytes calldata _signature
    ) public pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);

        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

    function verify(
        uint256 _nonce,
        uint256 _txIndex,
        address _owner,
        bytes calldata signature
    ) public view returns (bool) {
        bytes32 messageHash = getMessageHash(_nonce, _txIndex, _owner);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        return isOwner[recoverSigner(ethSignedMessageHash, signature)];
    }

    function getNextNonce() public view onlyOwner returns (uint256) {
        return nonces[msg.sender] + 1;
    }
}
