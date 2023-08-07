// // The task is to build a lottery contract. The main specifications for this are :
// // 1. Each lottery ticket costs 10 USDC tokens to enter
// // 2. Any user is able to buy tickets from the contract
// // 3. There are multiple rounds of the lottery where a winning ticket is picked. One round of the lottery ends when 10 tickets have been sold.
// // 4. At the end of each round one ticket from that round is chosen randomly by the contract and the winner gets to claim the prize pool for that round.

// // SPDX-License-Identifier: MIT

// pragma solidity ^0.8.4;

// // import IERC20 interface

// error TransferError();

// contract TenUSDCLottery {
//     // token details
//     address public constant USDC = 0x6B175474E89094C44Da98b954EedeAC495271d0F; //placeholder
//     uint8 public constant usdcDecimals = 6;
//     // lottery details
//     uint8 public constant maxPlayersPerSeason = 10;
//     uint8 public constant entryPrice = 10;

//     uint256 public seasonCount;

//     // player details
//     // 10 tickets per season
//     // each season, make sure you record the player addresses
//     // keep track about the latest 'season number
//     mapping(uint => [](10)) seasons; // Array of 10

//     constructor(){

//     }

//     // Trigger: when someone enters the lottery
//     // check whether entry price is 10
//     // not be checking whether the player has multiple tickets in one season
//     // checks that the transfer of the ERC-20 token goes through
//     // update the season with the new player
//     // check whether there are 10 entries in the current season
//     // if true --> we will do the draw --> seasonCount +1
//     // if not true --> do nothing

//     enterLottery() external {
//         // player will actually need to call IERC20(USDC).approve(address(this), 10 * 1000);
//         (bool success,)=IERC20(USDC).transferFrom(msg.sender, address(this), 10 * 10^6);
//          if (!success) revert TransferError();

//         // if success, update seasons with player entry
//         seasons[seasonCount].push(msg.sender);

//         if(seasons[seasonCount].length == maxPlayersPerSeason) {
//             // we are ready to check for a winner
//             // not very familiar with chainlink VRF
//             // a lot of issues with randomness

//             uint256 randomValue = random();
//             uint8 winner = randomValue%maxPlayersPerSeason;

//             seasonCount++;

//             // disburse winnings
//             IERC20(USDC).transfer(seasons[seasonCount][winner], maxPlayersPerSeason * entryPrice * usdcDecimals);

            
//         }

//     }

//     function random() private view returns (uint256) {
//         return
//             uint256(
//                 keccak256(
//                     abi.encodePacked(block.difficulty, block.timestamp, players)
//                 )
//             );
//     }


// }


// storage ==> what is written into the chain -> costs a lot

// memory  ==> ram, it's only recorded when the transaction is being run

// mload (cheaper than) sload (gas optimisation)