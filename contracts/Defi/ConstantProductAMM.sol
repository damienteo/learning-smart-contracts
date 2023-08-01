// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

// Ref: https://solidity-by-example.org/defi/constant-product-amm/

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ConstantProductAMM {
    IERC20 public immutable token0;
    IERC20 public immutable token1;

    uint public reserve0;
    uint public reserve1;

    uint public totalSupply;
    mapping(address => uint) public balanceOf;

    constructor(address _token0, address _token1) {
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
    }

    function _mint(address _to, uint _amount) private {
        balanceOf[_to] += _amount;
        totalSupply += _amount;
    }

    function _burn(address _from, uint _amount) private {
        balanceOf[_from] -= _amount;
        totalSupply -= _amount;
    }

    function _update(uint _reserve0, uint _reserve1) private {
        reserve0 = _reserve0;
        reserve1 = _reserve1;
    }

    function swap(
        address _tokenIn,
        uint _amountIn
    ) external returns (uint amountOut) {
        require(
            _tokenIn == address(token0) || _tokenIn == address(token1),
            "INVALID_TOKEN"
        );

        require(_amountIn > 0, "INVALID_AMOUNT");

        bool isToken0 = _tokenIn == address(token0);

        (
            IERC20 tokenIn,
            IERC20 tokenOut,
            uint reserveIn,
            uint reserveOut
        ) = isToken0
                ? (token0, token1, reserve0, reserve1)
                : (token1, token0, reserve1, reserve0);

        tokenIn.transferFrom(msg.sender, address(this), _amountIn);

        uint amountInWithFee = (_amountIn * 997) / 1000;

        /*
        x = reserve0
        y = reserve1
        k = constant

        xy = k

        dx = change in token0
        dy = change in token1

        (x + dx)(y - dy) = k
        y - dy = k / (x + dx)
        y - ( k / (x + dx)) = dy
        y - ( xy / (x + dx)) = dy
        (yx + ydx -xy) / (x + dx) = dy

        ydx = reserve1 * change in token0
        x + dx = reserve0 + change in token0

        ydx / (x + dx) = dy
        */

        amountOut =
            (reserveOut * amountInWithFee) /
            (reserveIn + amountInWithFee);

        tokenOut.transfer(msg.sender, amountOut);

        _update(
            token0.balanceOf(address(this)),
            token1.balanceOf(address(this))
        );
    }

    function addLiquidity(
        uint _amount0,
        uint _amount1
    ) external returns (uint shares) {
        token0.transferFrom(msg.sender, address(this), _amount0);
        token1.transferFrom(msg.sender, address(this), _amount1);

        /*
        xy = k
        (x + dx) / (y + dy) = k'

        Adding tokens should not affect price before or after adding liquidity
        x/y = (x + dx) / (y + dy)

        x(y + dy) = y(x + dx)
        xy + xdy = xy + ydx
        
        * xdy = ydx

        x/y = dx/dy
        */

        if (reserve0 > 0 || reserve1 > 0) {
            require(
                reserve0 * _amount1 == reserve1 * _amount0,
                "INVALUE_AMOUNTS"
            );
        }

        /*
        f(x,y) = value of liquidity
        f(x,y) as sqrt(xy)

        L0 = f(x,y)
        L1 = f(x + dx, y + dy)
        T = total shares
        s = shares to mint

        L1 / L0 = (T + s) / T
        L1 * T = (T + s) * L0

        L1 * T = T * L0 + s * L0
        L1 * T - T * L0 = s * L0

        (L1 * T - T * L0) / L0 = s

        T(L1 - L0) / L0 = s

        Claim:

        (L1 - L0) / L0 = dx / x = dy / y

        Equation 1:

        L1 = f(x + dx, y + dy) = sqrt((x + dx)(y + dy))
        (L1 - L0) / L0 = ( sqrt((x + dx)(y + dy)) - sqrt(xy) ) / sqrt(xy)
        
        dx/dy = x/y
        dy = dx * y / x

        Equation 2:

        Equation 1 =  = (sqrt(xy + 2ydx + dx^2 * y / x) - sqrt(xy)) / sqrt(xy)

        --- Equation 2 ---
        Equation 1 = (sqrt(xy + 2ydx + dx^2 * y / x) - sqrt(xy)) / sqrt(xy)

        Multiply by sqrt(x) / sqrt(x)
        Equation 2 = (sqrt(x^2y + 2xydx + dx^2 * y) - sqrt(x^2y)) / sqrt(x^2y)
                   = (sqrt(y)(sqrt(x^2 + 2xdx + dx^2) - sqrt(x^2)) / (sqrt(y)sqrt(x^2))
        
        sqrt(y) on top and bottom cancels out

        --- Equation 3 ---
        Equation 2 = (sqrt(x^2 + 2xdx + dx^2) - sqrt(x^2)) / (sqrt(x^2)
        = (sqrt((x + dx)^2) - sqrt(x^2)) / sqrt(x^2)  
        = ((x + dx) - x) / x
        = dx / x

        Since dx / dy = x / y,
        dx / x = dy / y

        Finally
        (L1 - L0) / L0 = dx / x = dy / y
        */

        if (totalSupply == 0) {
            shares = _sqrt(_amount0 * _amount1);
        } else {
            shares = _min(
                (_amount0 * totalSupply) / reserve0,
                (_amount1 * totalSupply) / reserve1
            );
        }

        require(shares > 0, "INVALID_SHARES");

        _mint(msg.sender, shares);

        _update(
            token0.balanceOf(address(this)),
            token1.balanceOf(address(this))
        );
    }

    function removeLiquidity(
        uint _shares
    ) external returns (uint amount0, uint amount1) {
        /*
        dx, dy = amount of liquidity to remove
        dx = s / T * x
        dy = s / T * y

        Find dx, dy such that:
        v / L = s / T

        v = value of liquidity = f(dx, dy) = sqrt(dxdy)
        L = total liquidity = sqrt(xy)
        s = shares
        T = total supply

        v = s / T * L
        sqrt(dxdy) = s / T * sqrt(xy)

        dx / dy = x / y

        replace dy = dx * y / x

        sqrt(dxdy) = sqrt(dx * dx * y / x) 
        sqrt(dx * dx * y / x) = dx * sqrt(y / x)

         Divide both sides of Equation 1 with sqrt(y / x)

         dx = s / T * sqrt(xy) / sqrt(y / x)
           = s / T * sqrt(x^2) = s / T * x

        Likewise
        dy = s / T * y

        */

        // bal0 >= reserve0
        // bal1 >= reserve1

        uint bal0 = token0.balanceOf(address(this));
        uint bal1 = token1.balanceOf(address(this));

        amount0 = (_shares * bal0) / totalSupply;
        amount1 = (_shares * bal1) / totalSupply;
        require(amount0 > 0 && amount1 > 0, "INVALID_AMOUNTS");

        _burn(msg.sender, _shares);
        _update(bal0 - amount0, bal1 - amount1);

        token0.transfer(msg.sender, amount0);
        token1.transfer(msg.sender, amount1);
    }

    function _sqrt(uint y) private pure returns (uint z) {
        if (y > 3) {
            z = y; // value of z as initialised by y
            uint x = y / 2 + 1; // initial estimate for the square root
            while (x < z) {
                z = x; // updates z to x
                x = (y / x + x) / 2; // update the value of x as the average of ( y / x ) and x
                // process repeats until 'x' can no longer be refined (equal or greater than z)
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function _min(uint x, uint y) private pure returns (uint) {
        return x <= y ? x : y;
    }
}
