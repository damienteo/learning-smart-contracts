// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// ref: https://solidity-by-example.org/defi/uniswap-v2-flash-swap/

// Involves involves taking advantage of price discrepancies or inefficiencies in different markets or exchanges within the limited time frame of a flash swap transaction
contract UniswapV2FlashSwap {
    address private constant UNISWAP_V2_FACTORY =
        0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;

    address private constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address private constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    IUniswapV2Factory private constant factory =
        IUniswapV2Factory(UNISWAP_V2_FACTORY);

    IERC20 private constant weth = IERC20(WETH);

    IUniswapV2Pair private immutable pair;

    uint public amountToRepay;

    constructor() {
        pair = IUniswapV2Pair(factory.getPair(DAI, WETH));
    }

    function flashSwap(uint wethAmount) external {
        bytes memory data = abi.encode(WETH, msg.sender);

        // temporarily transfers the specified amount of WETH to the UniswapV2FlashSwap contract.
        pair.swap(0, wethAmount, address(this), data);
    }

    // SUbsequently, this function is called by the UniswapV2 pair contract
    // From the pair contract:
    // if (data.length > 0) IUniswapV2Callee(to).uniswapV2Call(msg.sender, amount0Out, amount1Out, data);
    function uniswapV2Call(
        address sender,
        uint amount0,
        uint amount1,
        bytes calldata data
    ) external {
        require(msg.sender == address(pair), "INVALID_PAIR");
        require(sender == address(pair), "INVALID_SENDER");

        (address tokenBorrow, address caller) = abi.decode(
            data,
            (address, address)
        );

        require(tokenBorrow == WETH, "INVALID_TOKEN");

        uint fee = (amount1 * 3) / 997 + 1;
        amountToRepay = amount1 + fee;

        weth.transferFrom(caller, address(this), fee);

        weth.transfer(address(pair), amountToRepay);
    }
}

interface IUniswapV2Callee {
    function uniswapV2Call(
        address sender,
        uint amount0,
        uint amount1,
        bytes calldata data
    ) external;
}

interface IUniswapV2Pair {
    function swap(
        uint amount0Out,
        uint amount1Out,
        address to,
        bytes calldata data
    ) external;
}

interface IUniswapV2Factory {
    function getPair(
        address tokenA,
        address tokenB
    ) external view returns (address pair);
}

interface IWETH is IERC20 {
    function deposit() external payable;

    function withdraw(uint amount) external;
}
