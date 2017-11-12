var mongoose = require('mongoose');

// define the schema for our user model
var customerSchema = mongoose.Schema({
  aadhar: String,
  mobile: String,
  kychash: String,
  kycStatus: String,
  ethereumAddress: String
});

// create the model for customers and expose it to our app
module.exports = mongoose.model('Customer', customerSchema);
