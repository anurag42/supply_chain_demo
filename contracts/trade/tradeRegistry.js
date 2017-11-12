var Web3 = require('web3');
var web3 = new Web3();
var events = require('events');
var eventEmitter = new events.EventEmitter();
var config = require('../../config.js');
var tradedb = require('../../trade/db');
var ipfs = require('../../file/ipfs');
require('../../build/ABI/tradeLib.js');
require('../../build/Binary\ Code/tradeLib.js');
require('../../build/ABI/tradeRegistry.js');
require('../../build/Binary\ Code/tradeRegistry.js');
var tradeLibContract = web3.eth.contract(tradeLibABI);
var tradeContract = web3.eth.contract(tradeRegistryABI);
web3.setProvider(new web3.providers.HttpProvider(config.web3Provider));

module.exports = {
  deployTradeLib: function(){
    tradeLibContract.new(
   {
     from: config.ethAddress,
     data: tradeLibContractCode,
     gas: '4700000'
   }, function (e, contract){
    if (typeof contract.address !== 'undefined') {
         console.log('Contract mined! address: ' + contract.address + ' transactionHash: ' + contract.transactionHash);
         deployTradeRegistry(contract.address);
    }
 })
  },
  deployTradeRegistry: function(tradeLibAddress){
    console.log("trade Lib Address", tradeLibAddress);
    console.log("Slice and add ''", tradeLibAddress.slice(2));
    tradeContract.new({
      from: config.ethAddress,
      data: tradeRegistryContractCode.replace(/__TradeLib__+/g, tradeLibAddress.slice(2)),
      gas: '4700000'
    }, function(e, contract) {
      if (typeof contract.address !== 'undefined') {
        registrydb.saveRegistryAddress(contract.address);
      }
    })
  },
  setup: function(tradeRegistryAddress, tradeID, addresses, roles, callback) {
    var tradeInstance = tradeContract.at(tradeRegistryAddress);
    var gasUsage = (tradeInstance.createTrade.estimateGas(tradeID, addresses, roles) < config.gasUsage) ? tradeInstance.createTrade.estimateGas(tradeID, addresses, roles) : config.gasUsage;
    var params = {
      gas: gasUsage,
      gasPrice: config.gasPrice,
      from: config.ethAddress
    };
    tradeInstance.createTrade.sendTransaction(tradeID, addresses, roles, params, setupCallback.bind({'tradeInstance': tradeInstance, 'tradeID': tradeID, 'callback': callback}));
  },

  download: function(req, res, tradeInstance, dwnldDoc) {
    gasUsage = (tradeInstance.getLatestDoc.estimateGas(dwnldDoc) < config.gasUsage) ? tradeInstance.getLatestDoc.estimateGas(dwnldDoc) : config.gasUsage;
    var params =  {
      gas: gasUsage,
      from: config.ethAddress
    };
    tradeInstance.getLatestDoc.sendTransaction(dwnldDoc, params, downloadCallback.bind({'req': req, 'res': res, 'tradeInstance': tradeInstance}));
  },

  sendApproveTxn: function(req, res, tradeInstance, sender, docName) {
    gasUsage = (tradeInstance.approve.estimateGas(sender, docName) < config.gasUsage) ? tradeInstance.approve.estimateGas(sender, docName) : config.gasUsage;
    var params = {
      gas: gasUsage,
      gasPrice: config.gasPrice,
      from: config.ethAddress
    };
    tradeInstance.approve.sendTransaction(sender, docName, params, function(error, result) {
      if (error) {
        console.error(error);
        response.send(error);
        return;
      }

      hasApproved(tradeInstance, updateTradeStatus.bind({
        'req': req,
        'res': res
      }));
    });
  },

  sendRejectTxn: function(req, res, tradeInstance, sender, docName, reason) {
    gasUsage = (tradeInstance.reject.estimateGas(sender, docName, reason) < config.gasUsage) ? tradeInstance.reject.estimateGas(sender, docName, reason) : config.gasUsage;
    tradeInstance.reject.sendTransaction(sender, docName, reason, {
      gas: gasUsage,
      from: config.ethAddress
    }, function(error, result) {
      if (error) {
        console.error(error);
        response.send(error);
        return;
      }
      hasRejected(tradeInstance, updateTradeStatus.bind({
        'req': req,
        'res': res
      }));
    });
  },

  sendDocUploadTxn: function(req, res, tradeInstance, sender, docName, hashArr2) {
    gasUsage = (tradeInstance.upload.estimateGas(sender, docName, hashArr2) < config.gasUsage) ? tradeInstance.upload.estimateGas(sender, docName, hashArr2) : config.gasUsage;
    console.log("Uploading Doc");
    var params = {
      gas: gasUsage,
      gasPrice: config.gasPrice,
      from: config.ethAddress
    };
    tradeInstance.upload.sendTransaction(sender, docName, hashArr2, params, function(err, result) {
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

  hasUploaded: function(tradeInstance, txnID, tradeID, callback) {
    tradeInstance.LogUpload().watch(function(e, log) {
      if (e) {
        return hadError(e, res);
      }
      tradeInstance.LogUpload().stopWatching();
      console.log('Document Upload succcessful on Blockchain');
      callback(tradeID, txnID, log.args.docName);
    });
  },

  hasApproved: function(tradeInstance, callback) {
    tradeInstance.LogApprove().watch(function(e, log) {
      if (e) {
        return hadError(e, res);
      }
      tradeInstance.LogApprove().stopWatching();
      console.log('Document Approval recorded on Blockchain');
      callback();
    });
  },

  hasRejected: function(tradeInstance, callback) {
    tradeInstance.LogReject().watch(function(e, log) {
      if (e) {
        return hadError(e, res);
      }
      tradeInstance.LogReject().stopWatching();
      console.log('Document Approval recorded on Blockchain');
      callback();
    });
  },

  hadError: function(err, res) {
    console.error(err);
    res.end(error);
  }
}

function watchTradePartiesSetup(tradeInstance, tradeID, callback) {
  console.log("Watching Trade Parties Setup");
  tradeInstance.LogTradeCreated({uid: tradeID}).watch(function(e, log) {
    if (e) {
      console.error(e);
      return;
    }
    console.log('Trade parties setup successful');
    callback();
  });
}

function hasApproved(tradeInstance, callback) {
  tradeInstance.LogApprove().watch(function(e, log) {
    if (e) {
      return hadError(e, res);
    }
    tradeInstance.LogApprove().stopWatching();
    console.log('Document Approval recorded on Blockchain');
    callback();
  });
}

function hasRejected(tradeInstance, callback) {
  tradeInstance.LogReject().watch(function(e, log) {
    if (e) {
      return hadError(e, res);
    }
    tradeInstance.LogReject().stopWatching();
    console.log('Document Approval recorded on Blockchain');
    callback();
  });
}

function hasUploaded(tradeInstance, txnID, tradeID, callback) {
  tradeInstance.LogUpload().watch(function(e, log) {
    if (e) {
      return hadError(e, res);
    }
    tradeInstance.LogUpload().stopWatching();
    console.log('Document Upload succcessful on Blockchain');
    callback(tradeID, txnID, log.args.docName);
  });
}

function updateTradeStatus() {
  var status;
  tradedb.findTradeByTradeID(req.body.trade_id, req, res, updateTradeStatusCallback);
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


function updateTradeStatusCallback(err, trade) {
  if (trade.status == "Invoice Approved By Seller Bank; Ethereum Txn Pending;") status = "Invoice Approved";
  else if (trade.status == "Invoice Rejected By Seller Bank; Ethereum Txn Pending;") status = "Invoice Rejected";
  else status = trade.status.split(';')[0];
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

function watchGetDoc(req, res, tradeInstance) {
  tradeInstance.LogGetDoc().watch(function(e, log) {
    if (e) {
      return hadError(e, res);
    }
    tradeInstance.LogGetDoc().stopWatching();
    console.log('Document Upload succcessful on Blockchain');
    var hash = hexToString(log.args.hash);
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
  if (error) {
    console.error(error);
    res.send(error);
    return;
  }
  watchGetDoc(this.req, this.res, this.tradeInstance);
}

function deployTradeRegistry(tradeLibAddress){
  console.log("trade Lib Address", tradeLibAddress);
  console.log("Slice and add ''", tradeLibAddress.slice(2));
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
