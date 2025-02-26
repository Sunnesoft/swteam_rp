const app = require("./app");
const connectDatabase = require("./config/database");
const cloudinary = require("cloudinary");
const PORT = process.env.PORT || 3099;
const { Web3 } = require("web3");
const web3 = new Web3();
const ethers = require('ethers');
const asyncErrorHandler = require("./middlewares/helpers/asyncErrorHandler");
const ErrorHandler = require("./utils/errorHandler");

const config = { 
  rpcUrl: {
      ethMainnet: 'https://ethereum-rpc.publicnode.com',
  },
  erc20: {
      ethMainnet: {
          USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      },
  },
};

const Erc20Abi = [
  {
      "constant": true,
      "inputs": [],
      "name": "name",
      "outputs": [
          {
              "name": "",
              "type": "string"
          }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
  },
  {
      "constant": false,
      "inputs": [
          {
              "name": "_spender",
              "type": "address"
          },
          {
              "name": "_value",
              "type": "uint256"
          }
      ],
      "name": "approve",
      "outputs": [
          {
              "name": "",
              "type": "bool"
          }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "constant": true,
      "inputs": [],
      "name": "totalSupply",
      "outputs": [
          {
              "name": "",
              "type": "uint256"
          }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
  },
  {
      "constant": false,
      "inputs": [
          {
              "name": "_from",
              "type": "address"
          },
          {
              "name": "_to",
              "type": "address"
          },
          {
              "name": "_value",
              "type": "uint256"
          }
      ],
      "name": "transferFrom",
      "outputs": [
          {
              "name": "",
              "type": "bool"
          }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "constant": true,
      "inputs": [],
      "name": "decimals",
      "outputs": [
          {
              "name": "",
              "type": "uint8"
          }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
  },
  {
      "constant": true,
      "inputs": [
          {
              "name": "_owner",
              "type": "address"
          }
      ],
      "name": "balanceOf",
      "outputs": [
          {
              "name": "balance",
              "type": "uint256"
          }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
  },
  {
      "constant": true,
      "inputs": [],
      "name": "symbol",
      "outputs": [
          {
              "name": "",
              "type": "string"
          }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
  },
  {
      "constant": false,
      "inputs": [
          {
              "name": "_to",
              "type": "address"
          },
          {
              "name": "_value",
              "type": "uint256"
          }
      ],
      "name": "transfer",
      "outputs": [
          {
              "name": "",
              "type": "bool"
          }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
  },
  {
      "constant": true,
      "inputs": [
          {
              "name": "_owner",
              "type": "address"
          },
          {
              "name": "_spender",
              "type": "address"
          }
      ],
      "name": "allowance",
      "outputs": [
          {
              "name": "",
              "type": "uint256"
          }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
  },
  {
      "payable": true,
      "stateMutability": "payable",
      "type": "fallback"
  },
  {
      "anonymous": false,
      "inputs": [
          {
              "indexed": true,
              "name": "owner",
              "type": "address"
          },
          {
              "indexed": true,
              "name": "spender",
              "type": "address"
          },
          {
              "indexed": false,
              "name": "value",
              "type": "uint256"
          }
      ],
      "name": "Approval",
      "type": "event"
  },
  {
      "anonymous": false,
      "inputs": [
          {
              "indexed": true,
              "name": "from",
              "type": "address"
          },
          {
              "indexed": true,
              "name": "to",
              "type": "address"
          },
          {
              "indexed": false,
              "name": "value",
              "type": "uint256"
          }
      ],
      "name": "Transfer",
      "type": "event"
  }
];

BigInt.prototype.toJSON = function () {
    return this.toString();
};

web3.setProvider(
  new web3.providers.HttpProvider(
    config.rpcUrl.ethMainnet
  )
);

// UncaughtException Error
process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`);
  process.exit(1);
});

// connectDatabase();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const contracts = {
    "ethMainnet": {
        "USDT": new web3.eth.Contract(
            Erc20Abi, 
            config.erc20.ethMainnet.USDT
        )
    }
}

const getContract = (network, tokenSymbol) => {
    if (Object.hasOwn(contracts, network)) {
        if (Object.hasOwn(contracts[network], tokenSymbol)) {
            return contracts[network][tokenSymbol];
        }

        throw new Error("unexpected token symbol");
    }

    throw new Error("unexpected network symbol");
}

const getErc20Balance = async (contract, userAddress) => {
    let decimals = await contract.methods.decimals().call();
    let token = await contract.methods.balanceOf(userAddress).call();

    return ethers.utils.formatUnits(token.toString(), decimals);
}

const fetchTokenBalance = asyncErrorHandler(async (request, response, next) => {
   let address = request.body.address;
   let tokenSymbol = request.body.tokenSymbol;
   let network = request.body.network;

   try {
        const contract = getContract(network, tokenSymbol);
        const balance =  await getErc20Balance(contract, address);
        console.log(balance);

        return response.status(200).json({
            balance: balance,
            currency: tokenSymbol,
            network: network,
        });
  } catch (err) {
        return next(new ErrorHandler("Something went wrong: " + err.message, 500));
  }
});

app.post("/wallet/balance", fetchTokenBalance);

const server = app.listen(PORT, () => {
  console.log(`Server running`);
});

// Unhandled Promise Rejection
process.on("unhandledRejection", (err) => {
  console.log(`Error: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});
