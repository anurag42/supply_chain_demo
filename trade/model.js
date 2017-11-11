var mongoose = require('mongoose');

// define the schema for our trade model
var tradeSchema = mongoose.Schema({
  trade_id: String,
  manufacturer_id: String,
  supplier_id: String,
  dealer_id: String,
  bank_id: String,
  shipper_id: String,
  customer_id: String,
  doc: [{
    doctype: String,
    hash: String,
    txnID: String
  }],
  paymentinfo: {
    No_of_days: Number,
    Credit_Amount: Number
  },
  status: String
});


// create the model for trade and expose it to our app
module.exports = mongoose.model('Trade', tradeSchema);
