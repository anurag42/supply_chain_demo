var tradedb = require('./db');
var userdb = require('../user/db');
const url = require('url');
var Trade = require('./model');
var User = require('../user/model');
var bodyParser = require('body-parser');
var events = require('events');
var eventEmitter = new events.EventEmitter();
var urlencodedParser = bodyParser.urlencoded({
  extended: false
});
var multer = require('multer');
var Scheduler = require('mongo-scheduler');
var scheduler = new Scheduler("mongodb://localhost/db_name", {
  doNotFire: false
});

var manufacturerHash, supplierHash, bankHash, shipperHash, tradeID, tradeLibAddress, tradeRegistryAddress;
var userHash, gasUsage;
var config = require('../config.js');
var file = require('../file/impl.js');
var Web3 = require('web3');
var web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider(config.web3Provider));

var orderContract;
var letterOfCreditContract;
tradeLibAddress = config.tradeLibAddress;
tradeRegistryAddress = config.tradeAddress;
var tradeFunctions = require('../contracts/trade/tradeRegistry.js');

//tradeFunctions.deployTradeLib();

eventEmitter.on('paymentSuccess', function(status, id) {
  tradedb.findTradeByTradeID(id, req, res, onFindTradePaymentSuccess);
});


module.exports = {
  getTradeSession1: function(req, res) {
    if (!req.session.sender) {
      res.redirect('/login');
    } else {
      tradedb.findTradeByTradeObjectID(req, res, onFindTradeSession1.bind({
        'req': req,
        'res': res
      }));
    }
  },

  getTradeSession2: function(req, res) {
    if (!req.session.sender) {
      res.redirect('/login');
    } else {
      tradedb.findTradeByTradeObjectID(req, res, onFindTradeSession2.bind({
        'req': req,
        'res': res
      }));
    }
  },

  middleware1: function(req, res) {
    if (req.body.senderpage != "Manufacturer") {
      res.redirect('/profile');
      return;
    }
    else{
      var pendingTasks = [GetManufacturerHash, GetSupplierHash, GetBankHash, GetShipperHash, SaveTrade];

      function next() {
        var currentTask = pendingTasks.shift();
        if (currentTask) currentTask();
      }
      next();

      function SaveTrade() {
        tradedb.createNewTrade(req, res, onNewTradeSession.bind({
          'req': req,
          'res': res
        }));
      }
      //Write A Single Callback function for these
      function GetShipperHash() {
        userdb.findUserByUsername(req.body.shipper_id, req, res, function(err, user) {
          if (err) return;
          shipperHash = user.ethereumAddress;
          next();
        });
      }

      function GetBankHash() {
        userdb.findUserByUsername(req.body.bank_id, req, res, function(err, user) {
          if (err) return;
          bankHash = user.ethereumAddress;
          next();
        });
      }

      function GetSupplierHash() {
        userdb.findUserByUsername(req.body.supplier_id, req, res, function(err, user) {
          if (err) return;
          supplierHash = user.ethereumAddress;
          next();
        });
      }

      function GetManufacturerHash() {
        userdb.findUserByUsername(req.body.manufacturer_id, req, res, function(err, user) {
          if (err) return;
          manufacturerHash = user.ethereumAddress;
          next();
        });
      }
    }
  },

  middleware2: function(req, res, next) {
    var pendingTasks = [setupTradeParties, updateTradeStatus];
    console.log("Middleware2", req.body.tradeID);

    function next(result) {
      var currentTask = pendingTasks.shift();
      if (currentTask) currentTask(result);
    }

    next();

    function setupTradeParties() {
      var addresses = [req.body.manufacturerHash, req.body.supplierHash, req.body.bankHash, req.body.shipperHash];
      var roles = ["buyer", "seller", "bank", "shipper"];
      tradeFunctions.setup(tradeRegistryAddress, req.body.tradeID, addresses, roles, next);
    }

    function updateTradeStatus() {
      console.log("Before Saving", req.body.tradeID);
      var query = {
        trade_id: req.body.tradeID
      };
      var update = {
        status: "Quotation Not Uploaded"
      };
      tradedb.updateTrade(query, update);
      res.send();
    }
  },

  resumetrade1: function(req, res) {
    tradedb.findTradeByTradeID(req.body.trade_id, req, res, onFindTradeResume1.bind({
      'req': req,
      'res': res
    }));
  },

  resumetrade2: function(req, res) {
    tradedb.findTradeByTradeID(req.body.trade_id, req, res, onFindTradeResume2.bind({
      'req': req,
      'res': res
    }));
  },

  uploadDoc: function(req, res) {
    file.fileupload(req, res, onFileUpload.bind({
      'req': req,
      'res': res,
      'id': req.body.id
    }));
  },

  approvetrade: function(req, res) {
    tradedb.findTradeByTradeID(req.body.trade_id, req, res, onFindTradeApprove.bind({
      'req': req,
      'res': res
    }));
  },

  rejecttrade: function(req, res) {
    tradedb.findTradeByTradeID(req.body.trade_id, req, res, onFindTradeReject.bind({
      'req': req,
      'res': res
    }));
  }
};

function onTriggerTrade(err) {
  if (err)
    throw err;
  res = this.res;
  console.log("onfunction");
  res.redirect('/profile');
}

function onFindTradeSession1(err, trade) {
  if (err)
    return err;
  var req = this.req;
  var res = this.res;
  res.render('tradepage1.ejs', {
    id: trade.trade_id,
    address: trade.contract_id,
    bank_id: trade.bank_id,
    seller_id: trade.supplier_id,
    buyer_id: trade.manufacturer_id,
    shipper_id: trade.shipper_id,
    quotation: trade.doc[0],
    po: trade.doc[1],
    invoice: trade.doc[2],
    status: trade.status,
    letterofcredit: trade.paymentinfo,
    creditAmount: trade.paymentinfo.Credit_Amount,
    timePeriod: trade.paymentinfo.No_of_days,
    billoflading: trade.doc[3],
    senderpage: req.session.sender,
    username: req.query.username,
    userAddress: req.session.userAddress
  });
}

function onFindTradeSession2(err, trade) {
  if (err)
    return err;
  var req = this.req;
  var res = this.res;
  res.render('tradepage2.ejs', {
    id: trade.trade_id,
    address: trade.contract_id,
    seller_id: trade.manufacturer_id,
    buyer_id: trade.dealer_id,
    shipper_id: trade.shipper_id,
    quotation: trade.doc[0],
    po: trade.doc[1],
    invoice: trade.doc[2],
    status: trade.status,
    letterofcredit: trade.paymentinfo,
    creditAmount: trade.paymentinfo.Credit_Amount,
    timePeriod: trade.paymentinfo.No_of_days,
    billoflading: trade.doc[3],
    senderpage: req.session.sender,
    username: req.query.username,
    userAddress: req.session.userAddress
  });
}

function orderShipped(address) {
  var loc = letterOfCreditContract.at(address);
  gasUsage = (loc.shipped.estimateGas() < config.gasUsage) ? loc.shipped.estimateGas() : config.gasUsage;
  loc.shipped.sendTransaction({
    gas: gasUsage,
    gasPrice: config.gasPrice,
    from: config.ethAddress
  }, function(error, result) {
    if (error) {
      console.error(error);
      response.send(error);
      return;
    }

    var myEvent = loc.LogShipped();
    myEvent.watch(function(err, res) {
      if (err) {
        console.error(err);
        response.send(err);
        return;
      }
      myEvent.stopWatching();
      var time = res.args.date.c[0];
      /* Read the parameters from the event */
      eventEmitter.emit('shippingDateTxnSuccess', time, 'Payment Scheduled');
    });
  });
}

function payToSeller(address) {
  var loc = letterOfCreditContract.at(address);
  gasUsage = (loc.pay.estimateGas() < config.gasUsage) ? loc.pay.estimateGas() : config.gasUsage;
  loc.pay.sendTransaction({
    gas: gasUsage,
    gasPrice: config.gasPrice,
    from: config.ethAddress
  }, function(error, result) {
    if (error) {
      console.error(error);
      response.send(error);
      return;
    }

    var myEvent = loc.LogPayment();
    myEvent.watch(function(err, res) {
      if (err) {
        console.error(err);
        response.send(err);
        return;
      }
      myEvent.stopWatching();
      /* Read the parameters from the event */
      if (res.args.s == "True") eventEmitter.emit('paymentSuccess', 'Payment Successful');
      if (res.args.s == "False") eventEmitter.emit('paymentSuccess', 'Payment Declined');
    });
  });
}

function approve(req, res, address, username, docName) {
  var orderInstance = orderContract.at(address);
  userdb.findUserByUsername(username, req, res, function(err, user) {
    sender = user.local.userHash;
    tradeFunctions.sendApproveTxn(req, res, orderInstance, sender, docName);
  });
}

function reject(req, res, address, username, docName, reason) {
  var orderInstance = orderContract.at(address);
  userdb.findUserByUsername(username, req, res, function(err, user) {
    sender = user.local.userHash;
    tradeFunctions.sendRejectTxn(req, res, orderInstance, sender, docName, reason);
  });
}

function locapprove(req, res, address, username) {
  var locInstance = letterOfCreditContract.at(address);
  userdb.findUserByUsername(username, req, res, function(err, user) {
    sender = user.local.userHash;
    letterOfCreditFunctions.sendLOCApproveTxn(req, res, locInstance, sender);
  });
}

function locreject(req, res, address, username, reason) {
  var locInstance = letterOfCreditContract.at(address);
  userdb.findUserByUsername(username, req, res, function(err, user) {
    sender = user.local.userHash;
    letterOfCreditFunctions.sendLOCRejectTxn(req, res, locInstance, sender, reason);
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

function onNewTradeSession(err, trade) {
  if (err)
    throw err;
  var res = this.res;
  res.send({
    tradeID: trade._id,
    manufacturer_id: trade.manufacturer_id,
    supplier_id: trade.supplier_id,
    status: trade.status,
    manufacturerHash: manufacturerHash,
    supplierHash: supplierHash,
    bankHash: bankHash,
    shipperHash: shipperHash
  });
}

function onFindTradeResume1(err, trade) {
  if (err)
    return err;
  req = this.req;
  res = this.res;
  console.log("senderpage=", req.body.senderpage);
  if (req.body.senderpage == "Manufacturer") {
    req.session.sender = "Buyer";
  } else if (req.body.senderpage == "Supplier") {
    req.session.sender = "Seller";
  }
  req.session.sender = req.body.senderpage;
  req.session.tradesession = trade._id;
  res.redirect('/tradesession1');
}

function onFindTradeResume2(err, trade) {
  if (err)
    return err;
  req = this.req;
  res = this.res;
  if (req.body.senderpage == "Dealer") {
    req.session.sender = "Buyer";
  } else if (req.body.senderpage == "Manufacturer") {
    req.session.sender = "Seller";
  }
  req.session.tradesession = trade._id;
  req.session.sender = req.body.senderpage;
  res.redirect('/tradesession2');
}

function onFindTradeApprove(err, trade) {
  if (err)
    return err;
  req = this.req;
  res = this.res;

  var query = {
    trade_id: req.body.trade_id
  };
  var update;
  eventEmitter.once('shippingDateTxnSuccess', function(time, status) {
    trade.status = status;
    trade.save(function(err) {
      if (err)
        throw err;
      payToSeller(trade.letterofcredit);
      return;
    });
  });

  switch (req.body.approvaltype) {
    case "Q":
      update = {
        status: "Quotation Approved; Ethereum Txn Pending;"
      };
      approve(req, res, trade.contract_id, trade.manufacturer_id, 'Quotation');
      break;
    case "P":
      update = {
        status: "Purchase Order Approved; Ethereum Txn Pending;"
      };

      approve(req, res, trade.contract_id, trade.supplier_id, 'PurchaseOrder');
      break;
    case "I":
      update = {
        status: "Invoice Approved by Buyer; Ethereum Txn Pending;"
      };

      approve(req, res, trade.contract_id, trade.manufacturer_id, 'Invoice');
      break;
    case "IA":
      update = {
        status: "Invoice Approved By Seller Bank; Ethereum Txn Pending;"
      };
      approve(req, res, trade.contract_id, trade.bank_id, 'Invoice');
      break;
    case "L":
      update = {
        status: "Letter Of Credit Approved by Buyer; Ethereum Txn Pending;"
      };
      locapprove(req, res, trade.letterofcredit.contract_id, trade.manufacturer_id);
      break;
    case "LA":
      update = {
        status: "Letter Of Credit Approved; Ethereum Txn Pending;"
      };
      locapprove(req, res, trade.letterofcredit.contract_id, trade.supplier_id);
      break;
    case "B":
      update = {
        status: "Bill Of Lading Approved by Buyer; Ethereum Txn Pending;"
      };
      approve(req, res, trade.contract_id, trade.manufacturer_id, 'BillOfLading');
      break;
    case "BA":
      update = {
        status: "Bill Of Lading Approved; Ethereum Txn Pending;"
      };
      approve(req, res, trade.contract_id, trade.bank_id, 'BillOfLading');
      break;
  }
  tradedb.updateTrade(query, update, redirectOnUpdation.bind({
    'tradeID': trade._id,
    'req': req,
    'res': res
  }));
}

function onFindTradeReject(err, trade) {
  if (err)
    return err;
  req = this.req;
  res = this.res;

  var query = {
    trade_id: req.body.trade_id
  };
  var update;
  eventEmitter.once('uploadDocTxnSuccess', function() {
    var list = trade.status.split(';');
    if (trade.status == "Invoice Rejected By Seller Bank; Ethereum Txn Pending;") trade.status = "Invoice Rejected";
    else trade.status = list[0];
    trade.save(function(err) {
      if (err)
        throw err;
      return;
    });
  });

  switch (req.body.approvaltype) {
    case "Q":
      update = {
        status: "Quotation Rejected; Ethereum Txn Pending;"
      };
      reject(req, res, trade.contract_id, trade.manufacturer_id, 'Quotation', req.body.reason);
      break;
    case "P":
      update = {
        status: "Purchase Order Rejected; Ethereum Txn Pending;"
      };
      reject(req, res, trade.contract_id, trade.supplier_id, 'PurchaseOrder', req.body.reason);
      break;
    case "I":
      update = {
        status: "Invoice Rejected; Ethereum Txn Pending;"
      };
      reject(req, res, trade.contract_id, trade.manufacturer_id, 'Invoice', req.body.reason);
      break;
    case "IA":
      update = {
        status: "Invoice Rejected; Ethereum Txn Pending;"
      };
      reject(req, res, trade.contract_id, trade.bank_id, 'Invoice', req.body.reason);
      break;
    case "L":
      update = {
        status: "Letter Of Credit Rejected; Ethereum Txn Pending;"
      };
      locreject(req, res, trade.letterofcredit.contract_id, trade.manufacturer_id, req.body.reason);
      break;
    case "LA":
      update = {
        status: "Letter Of Credit Rejected; Ethereum Txn Pending;"
      };
      locreject(req, res, trade.letterofcredit.contract_id, trade.supplier_id, req.body.reason);
    case "B":
      update = {
        status: "Bill Of Lading Rejected by Buyer; Ethereum Txn Pending;"
      };
      reject(req, res, trade.contract_id, trade.manufacturer_id, 'BillOfLading', req.body.reason);
      break;
    case "BA":
      update = {
        status: "Bill Of Lading Rejected; Ethereum Txn Pending;"
      };
      reject(req, res, trade.contract_id, trade.bank_id, 'BillOfLading', req.body.reason);
      break;
  }
  tradedb.updateTrade(query, update, redirectOnUpdation.bind({
    'tradeID': trade._id,
    'req': req,
    'res': res
  }));
}

function onFindTradePaymentSuccess(err, trade) {
  if (status == 'Payment Successful') web3.eth.sendTransaction({
    from: config.ethAddress,
    to: "0xc563ecbb71c4258539cd09c85dd5669a2a201a51",
    value: trade.letterofcredit.Credit_Amount
  });
  trade.status = status;
  trade.save(function(err) {
    if (err)
      throw err;
    return;
  });
}

function redirectOnUpdation() {
  var req = this.req;
  var res = this.res;
  req.session.tradesession = this.tradeID;
  req.session.sender = req.body.senderpage;
  res.redirect('/tradesession');
}

function onFileUpload(err, hash) {
  if (err)
    throw err;
  req = this.req;
  res = this.res;
  id = this.id;
  var query = {
    trade_id: id
  };
  if (req.body.senderpage == "quotation") {
    var update = {
      $set: {
        'doc.0.hash': hash[0].hash,
        'status': "Quotation Uploaded; Ethereum Txn Pending;"
      }
    }
    tradedb.updateTrade(query, update, redirectOnUpdation.bind({
      'tradeID': id,
      'req': req,
      'res': res
    }));
    tradedb.findTradeByTradeID(id, req, res, onFindTradeQuotationUpdate.bind({
      'req': req,
      'res': res,
      'hash': hash
    }));
  } else if (req.body.senderpage == "po") {
    var update = {
      $set: {
        'doc.1.hash': hash[0].hash,
        'status': "Purchase Order Uploaded; Ethereum Txn Pending;"
      }
    }
    tradedb.updateTrade(query, update);
    tradedb.findTradeByTradeID(id, req, res, onFindTradePOUpdate.bind({
      'req': req,
      'res': res,
      'hash': hash
    }));
  } else if (req.body.senderpage == "invoice") {
    var update = {
      $set: {
        'doc.2.hash': hash[0].hash,
        'status': "Invoice Order Uploaded; Ethereum Txn Pending;"
      }
    }
    tradedb.updateTrade(query, update);
    tradedb.findTradeByTradeID(id, req, res, onFindTradeInvoiceUpdate.bind({
      'req': req,
      'res': res,
      'hash': hash
    }));
  } else if (req.body.senderpage == "bol") {
    var update = {
      $set: {
        'doc.3.hash': hash[0].hash,
        'status': "Bill Of Lading Order Uploaded; Ethereum Txn Pending;"
      }
    }
    tradedb.updateTrade(query, update);
    tradedb.findTradeByTradeID(id, req, res, onFindTradeBOLUpdate.bind({
      'req': req,
      'res': res,
      'hash': hash
    }));
  }
}

function onFindTradeQuotationUpdate(err, trade) {
  // if there are any errs, return the err
  if (err)
    return done(err);
  req = this.req;
  res = this.res;
  hash = this.hash;
  uploadDoc(req, res, trade.contract_id, trade.seller_id, 'Quotation', hash[0].hash);
}

function onFindTradePOUpdate(err, trade) {
  // if there are any errs, return the err
  if (err)
    return done(err);
  req = this.req;
  res = this.res;
  hash = this.hash;
  uploadDoc(req, res, trade.contract_id, trade.buyer_id, 'PurchaseOrder', hash[0].hash);
}

function onFindTradeInvoiceUpdate(err, trade) {
  // if there are any errs, return the err
  if (err)
    return done(err);
  req = this.req;
  res = this.res;
  hash = this.hash;
  uploadDoc(req, res, trade.contract_id, trade.seller_id, 'Invoice', hash[0].hash);
}

function onFindTradeBOLUpdate(err, trade) {
  // if there are any errs, return the err
  if (err)
    return done(err);
  req = this.req;
  res = this.res;
  hash = this.hash;
  uploadDoc(req, res, trade.contract_id, trade.shipper_id, 'BillOfLading', hash[0].hash);
}

function uploadDoc(req, res, address, username, docName, docHash, tradeID) {
  var orderInstance = orderContract.at(address);
  var hashArr = str2bytearr(docHash);
  userdb.findUserByUsername(username, req, res, function(err, user) {
    sender = user.local.userHash;
    tradeFunctions.sendDocUploadTxn(req, res, orderInstance, sender, docName, hashArr);
  });
}
