var Trade = require('./model');
var session = require('express-session');
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
    if (req.body.bank_id)
      newTrade.bank_id = req.body.bank_id;
    if (req.body.supplier_id)
      newTrade.supplier_id = req.body.supplier_id;
    if (req.body.dealer_id)
      newTrade.dealer_id = req.body.dealer_id;
    newTrade.manufacturer_id = req.body.manufacturer_id;
    newTrade.shipper_id = req.body.shipper_id;
    newTrade.status = "No quotation till now";
    newTrade.save(callback);
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
    newTrade.status = "Quotation Not Uploaded";
    newTrade.save(callback);
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
  }

};
