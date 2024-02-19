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
  abi: Api3ServerV1Abi,
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

  /////// Next Section ////////
  /////// Check Bid Status ////////
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

  const bid = await auctionHouse.bids(bidId);
  console.log("Bids: ", bid);
  // check if the bid is awarded
  if (bid[0] === 2n) {
    //result is 2n so it is a bigint type
    // didn't console out it's awarded
    console.log("Bid is awarded");
  }

  //////// Next Section ////////
  //////// Listen for Awarded Bid ////////
  
  const awardedTransaction = await new Promise((resolve, reject) => {
    console.log("Waiting for bid to be awarded...");
    auctionHouse.on(
      "AwardedBid",
      (bidder, bidTopic, awardBidId, awardDetails, bidderBalance) => {
        //   console.log(`Event Data:`, { bidder, bidTopic, awardBidId, awardDetails, bidderBalance });
        if (bidId === awardBidId) {
          console.log("Bid awarded");
          auctionHouse.removeAllListeners("AwardedBid");
          resolve(awardDetails); // Ensure this is the correct data structure you want to resolve with
        }
      }
    );
  });

  // console.log(awardedTransaction);

  /////// Next Section ////////
  /////// Perform Oracle Update ////////

//   const abiCoder = new AbiCoder();

//   // const awardedTransaction = '0x'; // refer to Checking Bid Status and Listening for Awarded Bids

//   // We want to update the price feed proxy on SEPOLIA
//   const provider = new JsonRpcProvider(
//     "https://gateway.tenderly.co/public/sepolia"
//   );

//   // The contract that can update the price feed proxy
//   const api3ServerV1 = new Contract(
//     "0x709944a48cAf83535e43471680fDA4905FB3920a", // Api3ServerV1 contract address
//     Api3ServerV1Abi,
//     provider
//   );

//   // const performOracleUpdate = async () => {
//   const awardDetails = abiCoder.decode(
//     ["address", "bytes32", "bytes32", "uint256", "bytes", "bytes[]"],
//     awardedTransaction
//   );
//   console.log("Award Details: ", awardDetails);

//   const awardTx = await api3ServerV1.updateOevProxyDataFeedWithSignedData(
//     awardDetails[0], // proxy address
//     awardDetails[1], // dataFeedId
//     awardDetails[2], // updateId
//     awardDetails[3], // timestamp
//     awardDetails[4], // data
//     awardDetails[5], // packedOevUpdateSignatures
//     {
//       value: parseEther("0.01"), // bid amount
//     }
//   );
//   console.log(awardTx.hash);
//   await awardTx.wait();
//   console.log("Oracle update performed");
// };
// //};

  /////// Next Section ////////
  /////// Perform Oracle Update w Multicall ////////

  const provider = new JsonRpcProvider(
    'https://gateway.tenderly.co/public/sepolia'
  );
    //need a signer wallet
  const sepoliaWallet = new Wallet(privateKey, provider);
  
  const OevSearcherMulticallV1 = new Contract(
    '0xF6f7f3667Cf5A047Bd6aE7dE363642b71D188C37', // OevSearcherMulticallV1 contract address
    [
      'function externalMulticallWithValue(address[] calldata targets, bytes[] calldata data, uint256[] calldata values) external payable returns (bytes[] memory returndata)',
    ],
    sepoliaWallet  // <<<<<<<<<<  needs a signer not provider
  );

//   const awardedTransaction = '0x'; // refer to Checking Bid Status and Listening for Awarded Bids

// const performOracleUpdate = async () => {
  const multiTx = await OevSearcherMulticallV1.externalMulticallWithValue(
    [
      '0x709944a48cAf83535e43471680fDA4905FB3920a',
   //   '<liquidationEventContractAddress>',
    ],
   // [awardedTransaction, '<liquidationEventEncodedTransaction>'],
    [awardedTransaction],
   // [parseEther('0.01'), '<liquidationEventValue>'],
    [parseEther('0.01')],
    {
      value: parseEther('0.01'), // bid amount
    }
  );
// };
await multiTx.wait();
console.log('Oracle update performed');
}

// call the function
placeBidWithExpiration();

// This code may win the bid but there is no action after you have done it
