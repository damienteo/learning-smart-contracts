//SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-periphery/contracts/libraries/OracleLibrary.sol";

error InvalidPool();
error InvalidToken();

contract UniswapV3Twap {
    IUniswapV3Factory public immutable factory;
    uint24 public immutable poolFee;
    uint32 public immutable twapPeriod;

    address public immutable token0;
    address public immutable token1;
    address public immutable pool;

    constructor(
        address _factory,
        address _token0,
        address _token1,
        uint24 _fee
    ) {
        token0 = _token0;
        token1 = _token1;

        address _pool = IUniswapV3Factory(_factory).getPool(
            _token0,
            _token1,
            _fee
        );
        if (_pool == address(0)) {
            revert InvalidPool();
        }

        pool = _pool;
    }

    function estimateAmountOut(
        address _tokenIn,
        uint128 _amountIn,
        uint32 _secondsAgo
    ) external view returns (uint amountOut) {
        if (_tokenIn != token0 && _tokenIn != token1) {
            revert InvalidToken();
        }

        address tokenOut = _tokenIn == token0 ? token1 : token0;

        uint32[] memory secondsAgo = new uint32[](2);
        secondsAgo[0] = _secondsAgo;
        secondsAgo[1] = 0;

        // int56 since tick * time = int24 * uint32
        // 56 = 24 + 32
        (int56 tickCumulatives, ) = IUniswapV3Pool(pool).observe(secondsAgo);

        int56 tickCumulativesDelta = tickCumulatives[0] - tickCumulatives[1];

        // int56 / uint32 = int24
        int24 tick = int24(tickCumulativesDelta / _secondsAgo);

        if (
            tickCumulativesDelta < 0 && (tickCumulativesDelta % secondsAgo != 0)
        ) {
            tick--;
        }

        amountOut = OracleLibrary.getQuoteAtTick(
            tick,
            _amountIn,
            _tokenIn,
            tokenOut
        );
    }
}
