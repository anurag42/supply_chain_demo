var Web3 = require('web3');
var web3 = new Web3();
var events = require('events');
var eventEmitter = new events.EventEmitter();
var config = require('../../config.js');
var tradedb = require('../../trade/db');
var ipfs = require('../../file/ipfs');
require('../../build/ABI/tradeRegistry.js');
require('../../build/Binary\ Code/tradeRegistry.js');
var tradeContract = web3.eth.contract(tradeRegistryABI);
var tradeRegistryAddress = config.tradeAddress;
var eventScheduler = require('../../events/events.js');
web3.setProvider(new web3.providers.HttpProvider(config.web3Provider));

module.exports = {
  deployTradeReg: function() {
    tradeContract.new({
      from: config.ethAddress,
      data: tradeRegistryContractCode,
      gas: '4700000'
    }, function(e, contract) {
      if (typeof contract.address !== 'undefined') {
        registrydb.saveRegistryAddress(contract.address);
      }
    })
  },
  setup: function(tradeRegistryAddress, tradeID, addresses, roles, callback) {
    var tradeInstance = tradeContract.at(tradeRegistryAddress);
    console.log(addresses);
    var gasUsage = (tradeInstance.createTrade.estimateGas(tradeID, addresses, roles) < config.gasUsage) ? tradeInstance.createTrade.estimateGas(tradeID, addresses, roles) : config.gasUsage;
    var params = {
      gas: gasUsage,
      gasPrice: config.gasPrice,
      from: config.ethAddress
    };
    tradeInstance.createTrade.sendTransaction(tradeID, addresses, roles, params, setupCallback.bind({
      'tradeInstance': tradeInstance,
      'tradeID': tradeID,
      'callback': callback
    }));
  },

  download: function(req, res, tradeID, dwnldDoc) {
    console.log('3');
    var tradeInstance = tradeContract.at(tradeRegistryAddress);
    gasUsage = (tradeInstance.getLatestDoc.estimateGas(tradeID, dwnldDoc) < config.gasUsage) ? tradeInstance.getLatestDoc.estimateGas(tradeID, dwnldDoc) : config.gasUsage;
    var params = {
      gas: gasUsage,
      from: config.ethAddress
    };
    tradeInstance.getLatestDoc.sendTransaction(tradeID, dwnldDoc, params, downloadCallback.bind({
      'req': req,
      'res': res,
      'tradeInstance': tradeInstance,
      'tradeID': tradeID
    }));
  },

  sendApproveTxn: function(req, res, tradeID, userAddress, docName) {
    var action = "Approve";
    var extraData = [];
    var tradeInstance = tradeContract.at(tradeRegistryAddress);
    gasUsage = (tradeInstance.action.estimateGas(tradeID, userAddress, docName, action, extraData) < config.gasUsage) ? tradeInstance.action.estimateGas(tradeID, userAddress, docName, action, extraData) : config.gasUsage;
    var params = {
      gas: gasUsage,
      gasPrice: config.gasPrice,
      from: config.ethAddress
    };
    tradeInstance.action.sendTransaction(tradeID, userAddress, docName, action, extraData, params, function(error, result) {
      if (error) {
        console.error(error);
        response.send(error);
        return;
      }

      hasApproved(tradeInstance, userAddress, updateTradeStatus.bind({
        'req': req,
        'res': res
      }));
    });
  },

  sendRejectTxn: function(req, res, tradeID, userAddress, docName, reason) {
    var action = "Reject";
    //var extraData = reason;
    var extraData = [];
    var tradeInstance = tradeContract.at(tradeRegistryAddress);
    gasUsage = (tradeInstance.action.estimateGas(tradeID, userAddress, docName, action, extraData) < config.gasUsage) ? tradeInstance.action.estimateGas(tradeID, userAddress, docName, action, extraData) : config.gasUsage;
    var params = {
      gas: gasUsage,
      gasPrice: config.gasPrice,
      from: config.ethAddress
    };
    tradeInstance.action.sendTransaction(tradeID, userAddress, docName, action, extraData, params, function(error, result) {
      if (error) {
        console.error(error);
        response.send(error);
        return;
      }

      hasRejected(tradeInstance, userAddress, updateTradeStatus.bind({
        'req': req,
        'res': res
      }));
    });
  },

  sendDocUploadTxn: function(req, res, tradeID, sender, docName, hashArr) {
    console.log("In", tradeID, sender, docName, hashArr);
    var tradeInstance = tradeContract.at(tradeRegistryAddress);
    gasUsage = (tradeInstance.upload.estimateGas(tradeID, sender, docName, hashArr) < config.gasUsage) ? tradeInstance.upload.estimateGas(tradeID, sender, docName, hashArr) : config.gasUsage;
    var params = {
      gas: gasUsage,
      gasPrice: config.gasPrice,
      from: config.ethAddress
    };
    tradeInstance.upload.sendTransaction(tradeID, sender, docName, hashArr, params, function(err, result) {
      if (err) {
        console.error(err);
        return;
      }
      hasUploaded(tradeInstance, result, req.body.id, updateTradeStatusOnDocUpload.bind({
        'req': req,
        'res': res
      }));
    });
  },

  sendDepositTxn: function(tradeID, creditAmount, callback) {
    console.log('1');
    var tradeInstance = tradeContract.at(tradeRegistryAddress);
    gasUsage = (tradeInstance.deposit.estimateGas(tradeID) < config.gasUsage) ? tradeInstance.deposit.estimateGas(tradeID) : config.gasUsage;
    var params = {
      gas: gasUsage,
      gasPrice: config.gasPrice,
      value: creditAmount,
      from: config.ethAddress
    };
    tradeInstance.deposit.sendTransaction(tradeID, params, function(err, result) {
      if (err) {
        console.error(err);
        return;
      }
      hasDeposited(tradeInstance, tradeID, callback);
    });
  },

  uploadLoc: function(req, res, tradeID, creditAmount, timePeriod) {
    var tradeInstance = tradeContract.at(tradeRegistryAddress);
    gasUsage = (tradeInstance.uploadLoc.estimateGas(tradeID, creditAmount, timePeriod) < config.gasUsage) ? tradeInstance.uploadLoc.estimateGas(tradeID, creditAmount, timePeriod) : config.gasUsage;
    var params = {
      gas: gasUsage,
      gasPrice: config.gasPrice,
      from: config.ethAddress
    };
    tradeInstance.uploadLoc.sendTransaction(tradeID, creditAmount, timePeriod, params, function(err, result) {
      if (err) {
        console.error(err);
        return;
      }
      hasLocUploaded(tradeInstance, tradeID, updateLOCTradeStatusOnDocUpload.bind({
        'req': req,
        'res': res,
        'tradeID': tradeID
      }));
    });
  },

  hadError: function(err, res) {
    console.error(err);
    res.end(error);
  }
}

function watchTradePartiesSetup(tradeInstance, tradeID, callback) {
  console.log("Watching Trade Parties Setup");
  tradeInstance.LogTradeCreated({
    uid: tradeID
  }).watch(function(e, log) {
    if (e) {
      console.error(e);
      return;
    }
    console.log('Trade parties setup successful');
    callback();
  });
}

function hasApproved(tradeInstance, userAddress, callback) {
  tradeInstance.LogApprove({
    sender: userAddress
  }).watch(function(e, log) {
    if (e) {
      return hadError(e, res);
    }
    console.log('Document Approval recorded on Blockchain');
    console.log(log.args.time);
    callback(log.args.time.c[0]);
  });
}

function hasRejected(tradeInstance, userAddress, callback) {
  tradeInstance.LogReject({
    sender: userAddress
  }).watch(function(e, log) {
    if (e) {
      return hadError(e, res);
    }
    tradeInstance.LogReject().stopWatching();
    console.log('Document Approval recorded on Blockchain');
    callback();
  });
}

function hasUploaded(tradeInstance, txnID, tradeID, callback) {
  console.log("Watch");
  tradeInstance.LogUpload().watch(function(e, log) {
    if (e) {
      return hadError(e, res);
    }
    console.log('Document Upload succcessful on Blockchain');
    callback(tradeID, txnID, log.args.docName);
  });
}

function hasLocUploaded(tradeInstance, tradeID, callback) {
  console.log("watching");
  tradeInstance.LogUpload().watch(function(e, log) {
    if (e) {
      return hadError(e, res);
    }
    console.log('LOC Param setup succcessful on Blockchain');
    callback();
  });
}

function updateTradeStatus(time) {
  var req = this.req;
  var res = this.res;
  var status;
  tradedb.findTradeByTradeID(req.body.trade_id, req, res, updateTradeStatusCallback.bind({
    'time': time
  }));
}

function updateLOCTradeStatusOnDocUpload() {
  var req = this.req;
  var res = this.res;
  var status;
  tradedb.findTradeByTradeID(this.tradeID, req, res, updateLOCTradeStatusOnDocUploadCallback.bind({
    'req': req,
    'res': res,
    'tradeID': this.tradeID
  }));
}

function updateTradeStatusOnDocUpload() {
  var req = this.req;
  var res = this.res;
  var status;
  tradedb.findTradeByTradeID(req.body.id, req, res, updateTradeStatusOnDocUploadCallback);
}

function updateTradeStatusOnDocUploadCallback(err, trade) {
  status = trade.status.split(';')[0];
  console.log(status);
  var query = {
    trade_id: req.body.id
  };
  var update = {
    status: status
  };
  tradedb.updateTrade(query, update);
}

function updateLOCTradeStatusOnDocUploadCallback(err, trade) {
  var req = this.req;
  var res = this.res;
  status = trade.status.split(';')[0];
  console.log(status);
  var query = {
    trade_id: this.tradeID
  };
  var update = {
    'status': status,
    'paymentinfo.No_of_days': req.body.timePeriod,
    'paymentinfo.Credit_Amount': req.body.creditAmount
  };
  tradedb.updateTrade(query, update);
}

function updateTradeStatusCallback(err, trade) {
  var status;
  console.log("In Updating", trade.status);
  if (trade.status == "Invoice Approved By Seller Bank; Ethereum Txn Pending;") status = "Invoice Approved";
  else if (trade.status == "Invoice Rejected By Seller Bank; Ethereum Txn Pending;") status = "Invoice Rejected";
  else status = trade.status.split(';')[0];
  if (status == "Letter Of Credit Approved") eventScheduler.paymentScheduler(this.time, trade.paymentinfo.No_of_days, trade.trade_id);
  else if (status == "BillOfLading Approved" && trade.type == "OEMTODEALER") paySellerDirect(trade.trade_id, trade.seller_id);
  console.log("In Updating", status);
  var query = {
    trade_id: req.body.trade_id
  };
  var update = {
    status: status
  };
  tradedb.updateTrade(query, update);

  //
  if (status == "Bill Of Lading Approved") orderShipped(trade.letterofcredit.contract_id);
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

function watchGetDoc(req, res, tradeID, tradeInstance) {
  console.log('5');
  tradeInstance.LogGetDoc({
    uid: tradeID
  }).watch(function(e, log) {
    if (e) {
      return hadError(e, res);
    }
    console.log('Document download succcessful on Blockchain');
    console.log(log.args);
    console.log('---------------');
    console.log(log.args.hash);
    var hash = hexToString(log.args.hash);
    console.log(hash);
    ipfs.download(hash, res);
  });
}

function setupCallback(error, result) {
  if (error) {
    console.error(error);
    response.send(error);
    return;
  }
  watchTradePartiesSetup(this.tradeInstance, this.tradeID, this.callback);
}

function downloadCallback(error, result) {
  console.log('4');
  if (error) {
    console.error(error);
    return;
  }
  watchGetDoc(this.req, this.res, this.tradeID, this.tradeInstance);
}

function deployTradeRegistry(tradeLibAddress) {
  tradeContract.new({
    from: config.ethAddress,
    data: tradeRegistryContractCode.replace(/__TradeLib__+/g, tradeLibAddress.slice(2)),
    gas: '4700000'
  }, function(e, contract) {
    if (typeof contract.address !== 'undefined') {
      registrydb.saveRegistryAddress(contract.address);
    }
  })
}

function hasDeposited(tradeInstance, tradeID, callback) {
  console.log('2');
  tradeInstance.LogDeposit({
    uid: tradeID
  }).watch(function(e, log) {
    if (e) {
      return hadError(e, res);
    }
    console.log('Deposit succcessful');
    callback();
  });
}

function paySellerDirect(tradeID, sellerID) {
  userdb.findUserByUsername(sellerID, req, res, function(err, user) {
    if (err) return;
    web3.eth.sendTransaction({
      from: config.ethAddress,
      to: user.ethereumAddress,
      value: 100
    });
  });
}
