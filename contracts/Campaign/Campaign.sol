// SPDX-License-Identifier: UNLICENSED

pragma solidity >=0.7.0 <0.9.0;

// import "hardhat/console.sol";

contract CampaignFactory {
    address[] public deployedCampaigns;

    function createCampaign(uint256 minimum) public {
        address newCampaign = address(new Campaign(minimum, msg.sender));
        deployedCampaigns.push(newCampaign);
    }

    function getDeployedCampaigns() public view returns (address[] memory) {
        return deployedCampaigns;
    }
}

contract Campaign {
    struct Request {
        string description;
        uint256 value;
        address payable recipient;
        bool complete;
        uint256 approvalCount;
        mapping(address => bool) approvals;
    }

    Request[] public requests;
    address public manager;
    uint256 public minimumContribution;
    mapping(address => bool) public approvers;
    uint256 public approversCount;

    modifier restricted() {
        require(msg.sender == manager, "Only manager allowed");
        _;
    }

    constructor(uint256 minimum, address creator) {
        manager = creator;
        minimumContribution = minimum;
    }

    function contribute() public payable {
        // console.log(
        //     "The minimum contribution is %m, while value is %m",
        //     minimumContribution,
        //     msg.value
        // );
        require(
            msg.value >= minimumContribution,
            "Value is below minimum contribution"
        );
        approvers[msg.sender] = true;
        approversCount++;
    }

    function createRequest(
        string memory description,
        uint256 value,
        address recipient
    ) public restricted {
        uint256 idx = requests.length;
        requests.push();

        Request storage newRequest = requests[idx];

        newRequest.description = description;
        newRequest.value = value;
        newRequest.recipient = payable(recipient);
        newRequest.complete = false;
        newRequest.approvalCount = 0;
    }

    function approveRequest(uint256 index) public {
        Request storage request = requests[index];

        require(approvers[msg.sender], "User is not a contributor");
        require(
            !request.approvals[msg.sender],
            "User has already approved this request"
        );

        request.approvals[msg.sender] = true;
        request.approvalCount++;
    }

    function finalizeRequest(uint256 index) public restricted {
        Request storage request = requests[index];

        require(
            request.approvalCount > (approversCount / 2),
            "Not enough approvals"
        );
        require(!request.complete, "Request is already finalized");

        (bool sent, ) = request.recipient.call{value: request.value}("");
        require(sent, "Failed to send Ether");

        request.complete = true;
    }
}

// TODO: Allow withdrawals in campaign fails
