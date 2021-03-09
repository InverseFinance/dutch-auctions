const { ethers } = require('hardhat')

//npx hardhat run scripts/1_deploy.js --network <network>

async function main () {
  const DEPLOYER_ADDRESS = '0x3fcb35a1cbfb6007f9bc638d388958bc4550cb28'

  const Auction = await ethers.getContractFactory("Auction");
  const auction = await Auction.deploy(DEPLOYER_ADDRESS);

  await auction.deployed()
  console.log('[RESULT]: Auction contract deployed to:', auction.address)
  //console.log('[RESULT]: To verify contract on etherscan please run:')
  //console.log('[$]: npx hardhat verify --network live --constructor-args scripts/arguments.js '+auction.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
