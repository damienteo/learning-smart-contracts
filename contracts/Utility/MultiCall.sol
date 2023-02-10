// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract MultiCall {
    function multiCall(address[] calldata targets, bytes[] calldata data)
        external
        view
        returns (bytes[] memory)
    {
        require(targets.length == data.length, "INVALID_INPUT");

        bytes[] memory results = new bytes[](data.length);

        for (uint256 i; i < targets.length; i++) {
            (bool success, bytes memory result) = targets[i].staticcall(
                data[i]
            );
            require(success, "CALL_FAILED");
            results[i] = result;
        }

        return results;
    }
}

contract TestMultiCall {
    function test(uint256 _i) external pure returns (uint256) {
        return _i;
    }

    function getData(uint256 _i) external pure returns (bytes memory) {
        return abi.encodeWithSelector(this.test.selector, _i);
    }
}
