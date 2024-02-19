const {
    JsonRpcProvider,
    Contract,
    keccak256,
    AbiCoder,
    parseEther,
  } = require('ethers');
  const {
    abi: Api3ServerV1Abi,
  } = require('@api3/contracts/artifacts/contracts/api3-server-v1/Api3ServerV1.sol/Api3ServerV1.json');
  
  const abiCoder = new AbiCoder();
  
  const awardedTransaction = '0x'; // refer to Checking Bid Status and Listening for Awarded Bids
  
  const provider = new JsonRpcProvider(
    'https://gateway.tenderly.co/public/sepolia'
  );
  
  const api3ServerV1 = new Contract(
    '0x709944a48cAf83535e43471680fDA4905FB3920a', // Api3ServerV1 contract address
    Api3ServerV1Abi,
    provider
  );
  
  const performOracleUpdate = async () => {
    const awardDetails = abiCoder.decode(
      ['address', 'bytes32', 'bytes32', 'uint256', 'bytes', 'bytes[]'],
      awardedTransaction
    );
    const tx = await api3ServerV1.updateOevProxyDataFeedWithSignedData(
      awardDetails[0], // proxy address
      awardDetails[1], // dataFeedId
      awardDetails[2], // updateId
      awardDetails[3], // timestamp
      awardDetails[4], // data
      awardDetails[5], // packedOevUpdateSignatures
      {
        value: parseEther('0.1'), // bid amount
      }
    );
  };
  
  performOracleUpdate();