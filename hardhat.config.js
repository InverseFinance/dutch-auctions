const { task } = require('hardhat/config')

require('@nomiclabs/hardhat-etherscan')
require('@nomiclabs/hardhat-waffle')
require('dotenv').config()



module.exports = {
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
        blockNumber: 11929707
      }
    },
    rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
      accounts: [process.env.RINKEBY_PRIVKEY]
    },
    live: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
      accounts: [process.env.MAINNET_PRIVKEY]
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  solidity: {
    compilers: [
      {
        version: '0.7.3'
      },
      {
        version: '0.5.16'
      },
      {
        version: '0.6.11'
      }
    ]
  }
}
