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

var manufacturerHash, dealerHash, supplierHash, bankHash, shipperHash, tradeID, tradeLibAddress, tradeRegistryAddress;
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

//tradeFunctions.deployTradeReg();

eventEmitter.on('paymentSuccess', function(status, id) {
  tradedb.findTradeByTradeID(id, req, res, onFindTradePaymentSuccess);
});


module.exports = {
  triggertradenew: function(req, res) {
    tradedb.createNewTrade(req, res, onTriggerTrade.bind({
      'req': req,
      'res': res
    }));
  },
  getTradeSession: function(req, res) {
    if (!req.session.sender) {
      res.redirect('/login');
    } else {
      tradedb.findTradeByTradeObjectID(req, res, onFindTradeSession.bind({
        'req': req,
        'res': res
      }));
    }
  },

  middleware1: function(req, res) {
    if (req.body.senderpage == "Manufacturer" || req.body.senderpage == "Dealer") {
      var pendingTasks;
      console.log(req.body.tradetype);
      if (req.body.tradetype == "PARTSSUPPLIERTOOEM") pendingTasks = [GetManufacturerHash, GetSupplierHash, GetBankHash, GetShipperHash, SaveTrade];
      else if (req.body.tradetype == "OEMTODEALER") pendingTasks = [GetDealerHash, GetManufacturerHash, GetShipperHash, SaveTrade];

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

      function GetDealerHash() {
        userdb.findUserByUsername(req.body.dealer_id, req, res, function(err, user) {
          if (err) return;
          dealerHash = user.ethereumAddress;
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
    } else {
      res.redirect('/profile');
      return;
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
      var addresses;
      var roles;
      if (req.body.tradetype == "OEMTODEALER") {
        addresses = [req.body.dealerHash, req.body.manufacturerHash, req.body.shipperHash];
        roles = ["buyer", "seller", "shipper"];
      } else if (req.body.tradetype == "PARTSSUPPLIERTOOEM") {
        addresses = [req.body.manufacturerHash, req.body.supplierHash, req.body.bankHash, req.body.shipperHash];
        roles = ["buyer", "seller", "bank", "shipper"];
      }
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

  resumetrade: function(req, res) {
    tradedb.findTradeByTradeID(req.body.trade_id, req, res, onFindTradeResume.bind({
      'req': req,
      'res': res
    }));
  },

  // for redirect from customer login page
  getresumetrade: function(req, res) {
    var customerID = req.query.customerid;
    var senderpage = req.query.senderpage;
    tradedb.findTradeByCustomerID(customerID, onFindTradeResume.bind({
      'req': req,
      'res': res,
      'senderpage': senderpage
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
  res.redirect('/profile');
}

function onFindTradeSession(err, trade) {
  if (err)
    return err;
  var req = this.req;
  var res = this.res;
  if (trade.type == 'PARTSSUPPLIERTOOEM') {
    res.render('tradepage.ejs', {
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
  } else if (trade.type == 'OEMTODEALER') {
    res.render('tradepage1.ejs', {
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
  } else if (trade.type == 'DEALERTOCUSTOMER') {
    res.render('tradepage2.ejs', {
      id: trade.trade_id,
      address: trade.contract_id,
      seller_id: trade.dealer_id,
      buyer_id: trade.customer_id,
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

function approve(req, res, tradeID, userAddress, docName) {
  tradeFunctions.sendApproveTxn(req, res, tradeID, userAddress, docName);
}

function reject(req, res, tradeID, userAddress, docName, reason) {
  tradeFunctions.sendRejectTxn(req, res, tradeID, userAddress, docName, reason);
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
  console.log("trade");
  if (err)
    throw err;
  var res = this.res;
  var req = this.req;
  res.send({
    tradeID: trade._id,
    tradetype: req.body.tradetype,
    manufacturer_id: trade.manufacturer_id,
    supplier_id: trade.supplier_id,
    status: trade.status,
    manufacturerHash: manufacturerHash,
    supplierHash: supplierHash,
    bankHash: bankHash,
    shipperHash: shipperHash,
    dealerHash: dealerHash
  });
}

function onFindTradeResume(err, trade) {
  if (err)
    return err;
  req = this.req;
  res = this.res;
  var senderpage = req.body.senderpage;
  if (!senderpage) {
    senderpage = this.senderpage;
  }
  req.session.sender = senderpage;
  req.session.tradesession = trade._id;
  switch (trade.type) {
    case 'PARTSSUPPLIERTOOEM':
      if (req.body.senderpage == "Manufacturer") {
        req.session.sender = "Buyer";
      } else if (req.body.senderpage == "Supplier") {
        req.session.sender = "Seller";
      }
      break;
    case 'OEMTODEALER':
      if (req.body.senderpage == "Dealer") {
        req.session.sender = "Buyer";
      } else if (req.body.senderpage == "Manufacturer") {
        req.session.sender = "Seller";
      }
      break;
    case 'DEALERTOCUSTOMER':
      if (req.body.senderpage == "Customer") {
        req.session.sender = "Buyer";
      } else if (req.body.senderpage == "Dealer") {
        req.session.sender = "Seller";
      }
  }
  res.redirect('/tradesession');
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
  /*eventEmitter.once('shippingDateTxnSuccess', function(time, status) {
    trade.status = status;
    trade.save(function(err) {
      if (err)
        throw err;
      payToSeller(trade.letterofcredit);
      return;
    });
  });*/

  switch (req.body.approvaltype) {
    case "R":
      update = {
        status: "Request For Quotation Approved; Ethereum Txn Pending;"
      };
      break;
    case "Q":
      update = {
        status: "Quotation Approved; Ethereum Txn Pending;"
      };
      approve(req, res, trade.trade_id, req.body.userAddress, 'Quotation');
      break;
    case "P":
      update = {
        status: "Purchase Order Approved; Ethereum Txn Pending;"
      };
      approve(req, res, trade.trade_id, req.body.userAddress, 'PurchaseOrder');
      break;
    case "I":
      update = {
        status: "Invoice Approved by Buyer; Ethereum Txn Pending;"
      };

      approve(req, res, trade.trade_id, req.body.userAddress, 'Invoice');
      break;
    case "IA":
      update = {
        status: "Invoice Approved By Seller Bank; Ethereum Txn Pending;"
      };
      approve(req, res, trade.trade_id, req.body.userAddress, 'Invoice');
      break;
    case "L":
      update = {
        status: "Letter Of Credit Approved by Buyer; Ethereum Txn Pending;"
      };
      approve(req, res, trade.trade_id, req.body.userAddress, 'LetterOfCredit');
      break;
    case "LA":
      update = {
        status: "Letter Of Credit Approved; Ethereum Txn Pending;"
      };
      approve(req, res, trade.trade_id, req.body.userAddress, 'LetterOfCredit');
      break;
    case "B":
      if (trade.type == "PARTSSUPPLIERTOOEM") {
        update = {
          status: "Bill Of Lading Approved by Buyer; Ethereum Txn Pending;"
        };
      } else if (trade.type == "OEMTODEALER") {
        update = {
          status: "Bill Of Lading Approved; Ethereum Txn Pending;"
        };
      }
      approve(req, res, trade.trade_id, req.body.userAddress, 'BillOfLading');
      break;
    case "BA":
      update = {
        status: "Bill Of Lading Approved; Ethereum Txn Pending;"
      };
      approve(req, res, trade.trade_id, req.body.userAddress, 'BillOfLading');
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
      reject(req, res, trade.trade_id, req.body.userAddress, 'Quotation', req.body.reason);
      break;
    case "P":
      update = {
        status: "Purchase Order Rejected; Ethereum Txn Pending;"
      };
      reject(req, res, trade.trade_id, req.body.userAddress, 'PurchaseOrder', req.body.reason);
      break;
    case "I":
      update = {
        status: "Invoice Rejected; Ethereum Txn Pending;"
      };
      reject(req, res, trade.trade_id, req.body.userAddress, 'Invoice', req.body.reason);
      break;
    case "IA":
      update = {
        status: "Invoice Rejected; Ethereum Txn Pending;"
      };
      reject(req, res, trade.trade_id, req.body.userAddress, 'Invoice', req.body.reason);
      break;
    case "L":
      update = {
        status: "Letter Of Credit Rejected; Ethereum Txn Pending;"
      };
      reject(req, res, trade.trade_id, req.body.userAddress, 'LetterOfCredit', req.body.reason);
      break;
    case "LA":
      update = {
        status: "Letter Of Credit Rejected; Ethereum Txn Pending;"
      };
      reject(req, res, trade.trade_id, req.body.userAddress, 'LetterOfCredit', req.body.reason);
    case "B":
      if (trade.type == "PARTSSUPPLIERTOOEM") {
        update = {
          status: "Bill Of Lading Rejected by Buyer; Ethereum Txn Pending;"
        };
      } else if (trade.type == "OEMTODEALER") {
        update = {
          status: "Bill Of Lading Rejected; Ethereum Txn Pending;"
        };
      }
      reject(req, res, trade.trade_id, req.body.userAddress, 'BillOfLading', req.body.reason);
      break;
    case "BA":
      update = {
        status: "Bill Of Lading Rejected; Ethereum Txn Pending;"
      };
      reject(req, res, trade.trade_id, req.body.userAddress, 'BillOfLading', req.body.reason);
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
  var update;
  if (req.body.senderpage == "rfq") {
    var update = {
      $set: {
        'doc.0.hash': hash[0].hash,
        'status': "Request For Quotation Uploaded; Ethereum Txn Pending;"
      }
    }
    tradedb.updateTrade(query, update, redirectOnUpdation.bind({
      'tradeID': id,
      'req': req,
      'res': res
    }));
    tradedb.findTradeByTradeID(id, req, res, onFindTradeRequestForQuotationUpdate.bind({
      'req': req,
      'res': res,
      'hash': hash
    }));
  } else if (req.body.senderpage == "quotation") {
    update = {
      $set: {
        'doc.0.hash': hash[0].hash,
        'status': "Quotation Uploaded; Ethereum Txn Pending;"
      }
    };
    tradedb.findTradeByTradeID(id, req, res, onFindTradeQuotationUpdate.bind({
      'req': req,
      'res': res,
      'hash': hash
    }));
  } else if (req.body.docname == "po") {
    update = {
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
  } else if (req.body.docname == "invoice") {
    update = {
      $set: {
        'doc.2.hash': hash[0].hash,
        'status': "Invoice Uploaded; Ethereum Txn Pending;"
      }
    }
    tradedb.updateTrade(query, update);
    tradedb.findTradeByTradeID(id, req, res, onFindTradeInvoiceUpdate.bind({
      'req': req,
      'res': res,
      'hash': hash
    }));
  } else if (req.body.docname == "bol") {
    update = {
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
  tradedb.updateTrade(query, update, redirectOnUpdation.bind({
    'tradeID': id,
    'req': req,
    'res': res
  }));
}

function onFindTradeRequestForQuotationUpdate(err, trade) {
  // if there are any errs, return the err
  if (err)
    return done(err);
  req = this.req;
  res = this.res;
  hash = this.hash;
  uploadDoc(req, res, trade.contract_id, trade.buyer_id, 'RequestForQuotation', hash[0].hash);
}

function onFindTradeQuotationUpdate(err, trade) {
  // if there are any errs, return the err
  if (err)
    return done(err);
  req = this.req;
  res = this.res;
  hash = this.hash;
  uploadDoc(req, res, req.body.id, req.body.userAddress, 'Quotation', hash[0].hash);
}

function onFindTradePOUpdate(err, trade) {
  // if there are any errs, return the err
  if (err)
    return done(err);
  req = this.req;
  res = this.res;
  hash = this.hash;
  uploadDoc(req, res, req.body.id, req.body.userAddress, 'PurchaseOrder', hash[0].hash);
}

function onFindTradeInvoiceUpdate(err, trade) {
  // if there are any errs, return the err
  if (err)
    return done(err);
  req = this.req;
  res = this.res;
  hash = this.hash;
  uploadDoc(req, res, req.body.id, req.body.userAddress, 'Invoice', hash[0].hash);
}

function onFindTradeBOLUpdate(err, trade) {
  // if there are any errs, return the err
  if (err)
    return done(err);
  req = this.req;
  res = this.res;
  hash = this.hash;
  uploadDoc(req, res, req.body.id, req.body.userAddress, 'BillOfLading', hash[0].hash);
}

function uploadDoc(req, res, tradeID, userAddress, docName, docHash) {
  var hashArr = str2bytearr(docHash);
  console.log(hashArr);
  tradeFunctions.sendDocUploadTxn(req, res, tradeID, userAddress, docName, hashArr);
}
