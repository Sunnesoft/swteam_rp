const config = require('../config/onchain');
const { Web3 } = require("web3");
const web3 = new Web3();
const ethers = require('ethers');
const asyncErrorHandler = require("../middlewares/helpers/asyncErrorHandler");
const ErrorHandler = require("../utils/errorHandler");

const {Erc20Abi} = require('../abi/erc20');

BigInt.prototype.toJSON = function () {
    return this.toString();
};

web3.setProvider(
    new web3.providers.HttpProvider(
      config.rpcUrl.ethMainnet
    )
  );

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

exports.fetchTokenBalance = asyncErrorHandler(async (request, response, next) => {
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