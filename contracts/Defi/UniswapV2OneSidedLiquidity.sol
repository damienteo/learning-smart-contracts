// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// ref: https://solidity-by-example.org/defi/uniswap-v2-optimal-one-sided-supply/

contract UniswapV2OneSidedLiquidity {
    address private constant FACTORY =
        0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    address private constant ROUTER =
        0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address private constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    function sqrt(uint y) private pure returns (uint z) {
        if (y > 3) {
            z = y;
            uint x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    /*
    s = optimal swap amoung
    r = amount of reserve for token a
    a = amount of token a the user current has (not added to reserve yet)
    f = swap amount fee
     s = (sqrt(((2 - f)r)^2 + 4(1 - f)ar) - (2 - f)r) / (2(1 - f))
    */

    // dennominator
    // 2(1 - f) = 1994
    // 1 - f = 997
    // f = -996

    // numerator = (sqrt(((2 - f)r)^2 + 4(1 - f)ar) - (2 - f)r)
    // (sqrt(((2 + 996)r)^2 + 4(1 + 996)ar) - (2 + 996)r)
    // (sqrt(((998)r)^2 + 4(997)ar) - (998)r)

    /*
    A = amount of token A in Uniswap
    B = amount of token V in Uniswap
    f = trading fee
    a = among of token A incoming
    b = amount of token B incoming
    s = amount of token to swap from A to B

    b=?

    K = AB


    K = (A + (1-f)s)(B-b)

    (1-f)s is the amount of token A incoming
    (B-b) as we will be receiving b to add liquidity with

    K = (A + (1-f)s)(B-b)

    How to get to: b = B(1-f)s / A + (1-f)s ?

    A + s / B -b = a-s / b → (1-f)^2 + A(2-f)s - aA = 0

    After the swap, the reserve ratio is A + s / B -b
    The ratio must be equal to a-s / b

    (A + s)b = (a-s)(B-b)
    (A + s)b - (a-s)(B-b) = 0
    Ab + sb - (aB -ab -sB + sb) = 0
    Ab + sb - aB + ab + sB - sb = 0
    Ab - aB + ab + sB = 0
    Ab + ab  - aB + sB = 0
    (A + a)b - (a - s)B = 0

    Substitute with:
    b = B(1-f)s / (A + (1 - f)s

    →

    A + s / B -b = a-s / b → (1-f)^2 + A(2-f)s - aA = 0

    (1-f)s^2 + A(2-f)s - aA = 0
    * ax^2 + bx + c
    * X = -b +- sqrt(b^2 - 4ac) / 2a

    = [-A(2-f) +- sqrt ( (A(2-f))^2 - 4(1-f)(-aA))] / 2(1-f)
    =-[A(2-f) +- sqrt ( (A(2-f))^2 + 4(1-f)(aA))] / 2(1-f)

    f = 3/1000

    Denominator = 2(1-f) = 2(997/1000) = 1994/1000

    Numerator (first portion) = A(2-f) = - 1997A/1000

    Numerator (Second Portion within sqrt) =  (A(2-f))^2 + 4(1-f)(aA))
    = 1997A/1000 ^ 2 + 4 * 997/1000 * aA
    = 3988009A^2 / 1000,000 + 4 * 997 / 1000 * aA 
    = 3988009A^2 / 1000,000 +3988 Aa / 1000 
    = 3988009A^2 / 1000,000 +3988000 Aa / 1000,000

    Resulting in 

    s = (-1997A + sqrt(398009A^2 + 3988000Aa)) / 1994

    Note the A in both 398009A^2 + 3988000Aa
    */

    function getSwapAmount(uint r, uint a) public pure returns (uint) {
        return (sqrt(r * (r * 3988009 + a * 3988000)) - r * 1997) / 1994;
    }

    function zap(address _tokenA, address _tokenB, uint _amountA) external {
        require(_tokenA == WETH || _tokenB == WETH, "NOT_WETH");

        IERC20(_tokenA).transferFrom(msg.sender, address(this), _amountA);

        address pair = IUniswapV2Factory(FACTORY).getPair(_tokenA, _tokenB);
        (uint reserve0, uint reserve1, ) = IUniswapV2Pair(pair).getReserves();

        uint swapAmount;
        if (IUniswapV2Pair(pair).token0() == _tokenA) {
            swapAmount = getSwapAmount(reserve0, _amountA);
        } else {
            swapAmount = getSwapAmount(reserve1, _amountA);
        }

        _swap(_tokenA, _tokenB, swapAmount);
        _addLiquidity(_tokenA, _tokenB);
    }

    function _swap(address _from, address _to, uint _amount) internal {
        IERC20(_from).approve(ROUTER, _amount);

        address[] memory path = new address[](2);
        path[0] = _from;
        path[1] = _to;

        IUniswapV2Router(ROUTER).swapExactTokensForTokens(
            _amount,
            1,
            path,
            address(this),
            block.timestamp
        );
    }

    function _addLiquidity(address _tokenA, address _tokenB) internal {
        uint balA = IERC20(_tokenA).balanceOf(address(this));
        uint balB = IERC20(_tokenB).balanceOf(address(this));
        IERC20(_tokenA).approve(ROUTER, balA);
        IERC20(_tokenB).approve(ROUTER, balB);

        IUniswapV2Router(ROUTER).addLiquidity(
            _tokenA,
            _tokenB,
            balA,
            balB,
            0,
            0,
            address(this),
            block.timestamp
        );
    }
}

interface IUniswapV2Router {
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

interface IUniswapV2Factory {
    function getPair(
        address token0,
        address token1
    ) external view returns (address);
}

interface IUniswapV2Pair {
    function token0() external view returns (address);

    function token1() external view returns (address);

    function getReserves()
        external
        view
        returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
}
