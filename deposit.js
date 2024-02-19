const { JsonRpcProvider, Wallet, Contract, parseEther } = require("ethers");
// Not compatible with noed 19.0.0 and above
const {
  abi: OevAuctionHouseAbi,
} = require("@api3/contracts/artifacts/contracts/api3-server-v1/OevAuctionHouse.sol/OevAuctionHouse.json");
// Add in dotenv
const dotenv = require("dotenv");
dotenv.config();

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

const deposit = async () => {
  const tx = await auctionHouse.deposit({
    value: parseEther("0.01"),
  });
  // add in console to show it's working
  console.log(tx.hash);
  await tx.wait();
  console.log("Deposited");
};

// Missing piece: call the tx
deposit();
