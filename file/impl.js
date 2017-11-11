var fs = require("fs");
const bs58 = require('bs58');
const url = require('url');
var multer = require('multer');
var bodyParser = require('body-parser');
var events = require('events');
var urlencodedParser = bodyParser.urlencoded({
  extended: false
});
var Trade = require('../trade/model');
var tradedb = require('../trade/db');
var Web3 = require('web3');
var buyerHash, sellerHash, buyerBankHash, sellerBankHash, shipperHash, docHash, dwnldDoc, dwnldDocHash, tradeRegistryAddress;
var User = require('../user/model');
var userdb = require('../user/db');
var eventEmitter = new events.EventEmitter();
var web3 = new Web3();
var gasUsage;
var ipfs = require('./ipfs');
var Registry = require('../registry/model.js');
var registrydb = require('../registry/db.js');
var config = require('../config.js');

//Fixed
var registryFunctions = require('../contracts/registry/registry.js');
var tradeFunctions = require('../contracts/trade/tradeRegistry.js');

//tradeFunctions.deployTradeRegistry();
tradeRegistryAddress = config.tradeAddress;

web3.setProvider(new web3.providers.HttpProvider(config.web3Provider));

var userHashReturned, index, completedDocs;
require('../build/ABI/registry.js');
require('../build/Binary\ Code/registry.js');
var registryContract = web3.eth.contract(registryABI);

registryAddress = config.registryAddress;
//checkIfRegistryDeployed(registryAddress);

module.exports = {
  fileupload: function(req, res, callback) {
    fs.readFile(req.files[0].path, function(err, data) {
      ipfs.upload(data, callback);
    });
  },
  filedownload: function(req, res) {
    ipfs.download(req.body.kychash, res);
  },

  docdownload: function(req, res) {
    tradedb.findTradeByTradeID(req.body.trade_id, req, res, onFindTradeDocDownload.bind({
      'req': req,
      'res': res
    }));
  },

  docdownloadbc: function(req, res) {
    tradedb.findTradeByTradeID(req.body.trade_id, req, res, onFindTradeDocDownload2.bind({
      'req': req,
      'res': res
    }));
  },

  getKYChash: function(req, res) {
    var usrHash = req.body.usrHash;
    registryFunctions.getKYChash(req, res, registryAddress, usrHash);
    /*var registryInstance = registryContract.at(registryAddress);
    gasUsage = (registryInstance.getKYChash.estimateGas(usrHash) < config.gasUsage) ? registryInstance.getKYChash.estimateGas(usrHash) : config.gasUsage;
    var params = {
      gas: gasUsage,
      gasPrice: config.gasPrice,
      from: config.ethAddress
    };

    registryInstance.getKYChash.sendTransaction(usrHash, params, onSendTxnGetKYC.bind({
      'registryInstance': registryInstance,
      'req': req,
      'res': res
    }));*/
  },

  letterOfCredit: function(req, res) {

    var query = {
      trade_id: req.body.trade_id
    };
    var update = {
      status: "Letter Of Credit Uploaded; Ethereum Txn Pending;"
    };
    tradedb.updateTrade(query, update, redirectOnLOCDeploy.bind({
      'tradeID': req.body.trade_id,
      'req': req,
      'res': res
    }));

    var pendingTasks = [deployLOC, saveContractId, GetBuyerHash, GetSellerHash, GetBuyerBankHash, GetSellerBankHash, payLOC, setLOCParams];

    function next(result) {
      var currentTask = pendingTasks.shift();
      if (currentTask) currentTask(result);
    }

    next();

    //Write A Single Callback function for these
    function deployLOC(result) {
      var params = {
        from: config.ethAddress,
        data: letterOfCreditContractCode,
        gas: '1500000',
        gasPrice: '4000000000'
      };
      letterOfCreditContract.new(params, function(e, contract) {
        if (typeof contract.address !== 'undefined') {
          locAddress = contract.address;
          console.log(locAddress);
          next(contract.address);
        }
      });
    }

    function saveContractId(result) {
      var query = {
        trade_id: req.body.trade_id
      };
      var update = {
        "letterofcredit.contract_id": result,
        "letterofcredit.No_of_days": req.body.timePeriod,
        "letterofcredit.Credit_Amount": req.body.creditAmount
      };
      tradedb.updateTrade(query, update);
      next();
    }

    function payLOC(address) {
      console.log(locAddress);
      var locInstance = letterOfCreditContract.at(locAddress);
      letterOfCreditFunctions.sendDepositTxn(locInstance, buyerBankHash, req.body.creditAmount);
      next();
    }

    function GetBuyerHash(result) {
      userdb.findUserByUsername(req.body.buyer, req, res, function(err, user) {
        if (err) return;
        buyerHash = user.local.userHash;
        next();
      });
    }

    function GetSellerHash(result) {
      userdb.findUserByUsername(req.body.seller, req, res, function(err, user) {
        if (err) return;
        sellerHash = user.local.userHash;
        next();
      });
    }

    function GetBuyerBankHash(result) {
      userdb.findUserByUsername(req.body.buyerBank, req, res, function(err, user) {
        if (err) return;
        buyerBankHash = user.local.userHash;
        next();
      });
    }

    function GetSellerBankHash(result) {
      userdb.findUserByUsername(req.body.sellerBank, req, res, function(err, user) {
        if (err) return;
        sellerBankHash = user.local.userHash;
        next();
      });
    }

    function setLOCParams() {
      console.log(locAddress);
      var locInstance = letterOfCreditContract.at(locAddress);
      letterOfCreditFunctions.setParams(locInstance, req.body.trade_id, buyerHash, sellerHash, buyerBankHash, sellerBankHash, req.body.creditAmount, req.body.timePeriod);
    }
  }

};

function deployRegistry() {
  registryContract.new({
    from: config.ethAddress,
    data: registryContractCode,
    gas: '4300000'
  }, function(e, contract) {
    if (typeof contract.address !== 'undefined') {
      registrydb.saveRegistryAddress(contract.address);
    }
  })
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

function onFindTradeDocDownload(err, trade) {
  // if there are any errs, return the err
  if (err)
    return done(err);
  req = this.req;
  res = this.res;
  console.log(trade.doc[0].doctype);
  switch (req.body.docname) {
    case "Quotation":
      docHash = trade.doc[0].hash;
      break;
    case "PurchaseOrder":
      docHash = trade.doc[1].hash;
      break;
    case "Invoice":
      docHash = trade.doc[2].hash;
      break;
    case "BillOfLading":
      docHash = trade.doc[3].hash;
      break;
  }
  console.log('Hash of ', req.body.docname, ': ', docHash);
  ipfs.download(docHash, res);
}

function onFindTradeDocDownload2(err, trade) {
  // if there are any errs, return the err
  if (err)
    return done(err);
  var req = this.req;
  var res = this.res;
  contractAddress = trade.contract_id;
  var tradeInstance = orderContract.at(contractAddress);
  orderFunctions.download(req, res, tradeInstance, req.body.docname);
}


function uploadCallback(err, hash) {
  var req = this.req;
  var res = this.res;
  if (err) {
    console.error(err);
    res.send(err);
  }
  /*var query = {
    local:{
    username: req.body.username
    }
  };
  var update = {
      local: {
      kychash: {push: hash[0].hash}
      }
  };
  userdb.updateUser(query, update);*/

  userdb.findUserByUsername(req.body.username, req, res, function(err, user) {
    if (!err) {
      user.local.kychash.push(hash[0].hash);
      user.save();
      var registryInstance = registryContract.at(registryAddress);
      registryFunctions.submitKYC(req, res, registryInstance, user.local.userHash, hash[0].hash, IsDocUploadComplete.bind({
        'req': req,
        'res': res
      }));
    }
  });
}

function IsDocUploadComplete() {
  var req = this.req;
  var res = this.res;
  ++completedDocs;
  console.log("CompletedDocs", completedDocs);
  //Each time a doc is uploaded onto Blockchain, event increments the count
  //Check if Doc Upload is complete; If so, redirect to profile page.
  if (completedDocs == req.files.length) {
    userdb.findUserByUsername(req.body.username, req, res, redirectOnUpload.bind({
      'req': req,
      'res': res
    }));
  }
}

function redirectOnUpload(err, user) {
  var req = this.req;
  var res = this.res;
  req.session.userId = user._id;
  console.log("Session", req.session);
  res.redirect('/profile');
}

function redirectOnLOCDeploy(err, user) {
  var req = this.req;
  var res = this.res;
  req.session.tradesession = req.body.trade_id;
  res.redirect('/tradesession');
}

function onCreateNewUserCallback() {
  completedDocs = 0;
}

function checkIfRegistryDeployed(registryAddress) {
  Registry.findOne({
    'deployed': 'Yes'
  }, function(err, Registry) {
    if (err)
      return err;
    if (Registry) {
      console.log('Registry Contract Already Deployed; Fetching from MONGO DB...');
      registryAddress = Registry.contract_id;
      console.log('Address of registry contract deployed:', registryAddress);
    } else {
      console.log('Deploying Registry Contract....');
      deployRegistry();
    }
  });
}

function onSendTxnGetKYC(err, result) {
  var registryInstance = this.registryInstance;
  if (err) {
    this.res.send(err);
    return;
  }
  registryFunctions.getKYChash(registryInstance, retrievedHash.bind({
    'res': this.res
  }));
}

function retrievedHash(err, docHash) {
  if (!err)
    ipfs.download(hexToString(docHash), this.res);
}

function redirectOnUpdation() {
  var req = this.req;
  var res = this.res;
  req.session.tradesession = this.tradeID;
  req.session.sender = req.body.senderpage;
  res.redirect('/tradesession');
}
