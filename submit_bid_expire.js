const {
  Wallet,
  Contract,
  JsonRpcProvider,
  keccak256,
  solidityPacked,
  AbiCoder,
  parseEther,
  hexlify,
  randomBytes,
} = require("ethers");
const {
  abi: OevAuctionHouseAbi,
} = require("@api3/contracts/artifacts/contracts/api3-server-v1/OevAuctionHouse.sol/OevAuctionHouse.json");
// Add in dotenv
const dotenv = require("dotenv");
dotenv.config();

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

const provider = new JsonRpcProvider(
  "https://oev-network-sepolia-testnet-rpc.eu-north-2.gateway.fm"
);

//Bring in Private Key from .env
const privateKey = process.env.PRIVATE_KEY;
const wallet = new Wallet(privateKey, provider);

const auctionHouse = new Contract(
  "0x7597985630674dA4D62Ae60ad4D10E40bb619B08", // OevAuctionHouse contract address
  OevAuctionHouseAbi,
  wallet
);

const placeBidWithExpiration = async () => {
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
  const tx = await auctionHouse.placeBidWithExpiration(
    bidTopic,
    11155111,
    parseEther("0.01"),
    bidDetails,
    parseEther("0"), // Collateral Basis Points is 0 on testnet
    parseEther("0"), // Protocol Fee Basis Points is 0 on testnet
    Math.floor(Date.now() / 1000) + 60 * 60 * 12 // 12 hours from now
  );
  console.log(tx.hash);
  await tx.wait();
  console.log("Bid placed");
};

// call the function
placeBidWithExpiration();

// This code may win the bid but there is no action after you have done it
