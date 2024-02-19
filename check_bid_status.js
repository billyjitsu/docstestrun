const {
  JsonRpcProvider,
  Contract,
  keccak256,
  AbiCoder,
  solidityPacked,
  hexlify,
  randomBytes,
} = require("ethers");
const {
  abi: OevAuctionHouseAbi,
} = require("@api3/contracts/artifacts/contracts/api3-server-v1/OevAuctionHouse.sol/OevAuctionHouse.json");

const provider = new JsonRpcProvider(
  "https://oev-network-sepolia-testnet-rpc.eu-north-2.gateway.fm"
);
const auctionHouse = new Contract(
  "0x7597985630674dA4D62Ae60ad4D10E40bb619B08", // OevAuctionHouse contract address
  OevAuctionHouseAbi,
  provider
);

/////////////////////////////
// Missing bid topic and bid details
const getBidTopic = (chainId, proxyAddress) => {
  return keccak256(
    solidityPacked(["uint256", "address"], [BigInt(chainId), proxyAddress])
  );
};

const getBidDetails = (
  proxyAddress,
  condition,
  conditionValue,
  updaterAddress
) => {
  const abiCoder = new AbiCoder();
  const BID_CONDITIONS = [
    { onchainIndex: 0n, description: "LTE" },
    { onchainIndex: 1n, description: "GTE" },
  ];
  const conditionIndex = BID_CONDITIONS.findIndex(
    (c) => c.description === condition
  );
  return abiCoder.encode(
    ["address", "uint8", "uint256", "address", "bytes32"],
    [
      proxyAddress,
      conditionIndex,
      conditionValue,
      updaterAddress,
      hexlify(randomBytes(32)),
    ]
  );
};

const bidTopic = getBidTopic(
  11155111,
  "0xa8cea58ab9060600e94bb28b2c8510b73171b55c" // WBTC Proxy address
);
const bidDetails = getBidDetails(
  "0xa8cea58ab9060600e94bb28b2c8510b73171b55c", // WBTC Proxy Address
  "GTE",
  50000,
  "0xF6f7f3667Cf5A047Bd6aE7dE363642b71D188C37" // Your deployed MultiCall contract Address
);

/////////////////////////////

const bidId = keccak256(
  solidityPacked(
    ["address", "bytes32", "bytes32"],
    [
      "0xe2b8651bF50913057fF47FC4f02A8e12146083B8",
      bidTopic,
      keccak256(bidDetails),
    ]
  )
);

const getBidStatus = async () => {
  // solidity enum BidStatus {
  //     None,
  //     Placed,
  //     Awarded,
  //     FulfillmentReported,
  //     FulfillmentConfirmed,
  //     FulfillmentContradicted
  // }
  console.log("Bid ID: ", bidId);
  const bid = await auctionHouse.bids(bidId);
  console.log("Bids: ", bid);
  // check if the bid is awarded
  if (bid[0] === 2) {
    console.log("Bid is awarded");
  }
};

getBidStatus();
