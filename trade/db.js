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
    newTrade.contract_id = "None";
    newTrade.bank_id = req.body.bank_id;
    newTrade.seller_id = req.body.seller_id;
    newTrade.buyer_id = req.body.buyer_id;
    newTrade.sellerbank_id = req.body.sellerbank_id;
    newTrade.shipper_id = req.body.shipper_id;
    newTrade.quotation.hash = "No quotation till now";
    newTrade.quotation.txnID = "None";
    newTrade.po.hash = "No Purchase Order till now";
    newTrade.po.txnID = "None";
    newTrade.invoice.hash = "No Invoice till now";
    newTrade.invoice.txnID = "None";
    newTrade.letterofcredit.No_of_days = 0;
    newTrade.letterofcredit.contract_id = "None";
    newTrade.letterofcredit.Credit_Amount = 0;
    newTrade.billoflading.hash = "No Bill of lading till now";
    newTrade.billoflading.txnID = "None";
    newTrade.status = "Ethereum Transaction Pending!!! Check after 2 mins!!!";
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
      if(!err && callback) callback();
    });
  }

};
