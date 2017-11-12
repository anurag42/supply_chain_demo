var Trade = require('./model');
var session = require('express-session');
var customerdb = require('../customer/db');
module.exports = {
  findTradeByTradeObjectID: function(req, res, callback) {
    Trade.findOne({
      '_id': req.session.tradesession
    }, callback);
  },

  createNewTrade: function(req, res, callback) {
    var newTrade = new Trade();
    // set the user's local credentials
    tradeID = newTrade._id;
    newTrade.trade_id = newTrade._id;
    newTrade.type = req.body.tradetype;
    newTrade.status = "RFQ Not Uploaded";
    newTrade.doc.push({
      doctype: 'rfq',
      hash: 'No Request for Quotation till now',
      txnID: 'None'
    });
    newTrade.doc.push({
      doctype: 'quotation',
      hash: 'No Quotation till now',
      txnID: 'None'
    });
    newTrade.doc.push({
      doctype: 'po',
      hash: 'No Purchase Order till now',
      txnID: 'None'
    });
    newTrade.doc.push({
      doctype: 'invoice',
      hash: 'No Invoice till now',
      txnID: 'None'
    });
    newTrade.doc.push({
      doctype: 'billoflading',
      hash: 'No Bill of Lading till now',
      txnID: 'None'
    });
    newTrade.status = "Ethereum Transaction Pending!!! Check after 2 mins!!!";
    if (req.body.tradeType == "PARTSSUPPLIERTOOEM") {
      newTrade.bank_id = req.body.bank_id;
      newTrade.supplier_id = req.body.supplier_id;
      newTrade.manufacturer_id = req.body.manufacturer_id;
      newTrade.shipper_id = req.body.shipper_id;
      newTrade.save(callback);
    } else if (req.body.tradeType == "OEMTODEALER") {
      newTrade.dealer_id = req.body.dealer_id;
      newTrade.manufacturer_id = req.body.manufacturer_id;
      newTrade.shipper_id = req.body.shipper_id;
      newTrade.save(callback);
    } else if (req.body.tradeType == "DEALERTOCUSTOMER") {
      newTrade.dealer_id = req.body.dealer_id;
      customerdb.getCustomerFromAadhar(req.body.customeraadhar_id, req, res, onFindCustomer.bind({
        'res': res,
        'req': req,
        'newTrade': newTrade,
        'callback': callback
      }));
    }
  },

  findTradeByTradeID: function(trade_id, req, res, callback) {
    Trade.findOne({
      'trade_id': trade_id
    }, callback);
  },

  updateTrade: function(query, update, callback) {
    var options = {
      multi: true
    };
    Trade.update(query, update, options, function(err, num) {
      console.error(err);
      if (!err && callback) callback();
    });
  },

  findTradeByCustomerID: function(customerID, callback) {
    Trade.findOne({
      'customer_id': customerID
    }, callback)
  }

};

function onFindCustomer(err, customer) {
  if (err)
    throw err;
  req = this.req;
  res = this.res;
  newTrade = this.newTrade;
  callback = this.callback;
  if (customer) {
    newTrade.customer_id = customer._id;
    newTrade.save(callback);
  } else {
    customerdb.createNewCustomer(req.body.customeraadhar_id, req.body.customermobile, onNewCustomer.bind({
      'req': req,
      'res': res,
      'newTrade': newTrade,
      'callback': callback
    }));
  }
}

function onNewCustomer(err, customer) {
  req = this.req;
  res = this.res;
  newTrade = this.newTrade;
  callback = this.callback;
  newTrade.customer_id = customer._id;
  newTrade.status = "KYC Not Uploaded";
  newTrade.save(callback);
}
