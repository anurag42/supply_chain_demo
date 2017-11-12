var Web3 = require('web3');
var web3 = new Web3();
var config = require('../../config.js');
require('../../build/ABI/registry.js');
require('../../build/Binary\ Code/registry.js');
var registryContract = web3.eth.contract(registryABI);
var registrydb = require('../../registry/db.js');
var ipfs = require('../../file/ipfs');
web3.setProvider(new web3.providers.HttpProvider(config.web3Provider));

module.exports = {
  deployRegistry: function(){
    registryContract.new({
      from: config.ethAddress,
      data: registryContractCode,
      gas: '4300000'
    }, function(e, contract) {
      if (typeof contract.address !== 'undefined') {
        registrydb.saveRegistryAddress(contract.address);
      }
    })
  },
  submitKYC: function(req, res, registryAddress, aadhaarID, userEthAddress, KYCHash, callback) {
    var registryInstance = registryContract.at(registryAddress);
    var hashArr = str2bytearr(KYCHash);
    gasUsage = (registryInstance.submitKYC.estimateGas(userEthAddress, aadhaarID, hashArr) < config.gasUsage) ? registryInstance.submitKYC.estimateGas(userEthAddress, aadhaarID, hashArr) : config.gasUsage;
    var params = {
      gas: gasUsage,
      gasPrice: config.gasPrice,
      from: config.ethAddress
    };
    registryInstance.submitKYC.sendTransaction(userEthAddress, aadhaarID, hashArr, params, submitKYCcallback.bind({'registryInstance': registryInstance, 'callback': callback, 'ethAddress': userEthAddress}));
  },
  getKYChash: function(req, res, registryAddress, usrHash) {
    var registryInstance = registryContract.at(registryAddress);
    gasUsage = (registryInstance.getKYChash.estimateGas(usrHash) < config.gasUsage) ? registryInstance.getKYChash.estimateGas(usrHash) : config.gasUsage;
    var params = {
      gas: gasUsage,
      gasPrice: config.gasPrice,
      from: config.ethAddress
    };
    registryInstance.getKYChash.sendTransaction(usrHash, params, getKYChashcallback.bind({'registryInstance': registryInstance, 'userHash': usrHash, 'req': req, 'res': res}));
  },

  hadError: function(err, res) {
    console.error(err);
    res.end(error);
  }
}

function getKYChashcallback(error, result){
  if (error) {
    console.error(error);
    return 'empty';
  }
  watchGetKYC(this.registryInstance, this.userHash, this.req, this.res);

}

function watchGetKYC(registryInstance, userHash, req, res){
  registryInstance.LogGetKYChash({ethAddress: userHash}).watch(function(e, log) {
    if (e) {
      return console.error(e);
    }
    console.log('KYC Hash retrieved from registry contract');
    ipfs.download(hexToString(log.args.KYChash), res);
  });
}

function submitKYCcallback(error, result) {
  if (error) {
    console.error(error);
    return 'empty';
  }
  watchSubmitKYC(this.registryInstance, this.callback);
}

function watchSubmitKYC(registryInstance, callback) {
  ethAddress = this.ethAddress;
  registryInstance.LogSubmitKYC({ethAddress: ethAddress}).watch(function(e, log) {
    if (e) {
      return console.error(e);
    }
    console.log('KYC Hash submitted to the registry contract');
    callback();
  });
}

function str2bytearr(str) {
  var data = [];
  for (var i = 0; i < str.length; i++) {
    data.push(str.charCodeAt(i));
  }
  return data;
}

function hexToString(hex) {
  var string = '';
  hex = hex.slice(2);
  for (var i = 0; i < hex.length; i += 2) {
    string += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  var list = string.slice(1, string.length - 1).split(',');
  var result = "";
  for (var i = 0; i < list.length; i++) {
    result += String.fromCharCode(parseInt(list[i]));
  }
  return result;
}
