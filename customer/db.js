var Customer = require('./model');
var session = require('express-session');
module.exports = {

  getCustomerFromAadhar: function(aadhar, callback) {
    Customer.findOne({
      'aadhar': aadhar
    }, callback);
  },

  createNewCustomer: function(account, aadhar, mobile, callback) {
    var newCustomer = new Customer();
    newCustomer.aadhar = aadhar;
    newCustomer.mobile = mobile;
    newCustomer.ethereumAddress = account;
    newCustomer.save(callback);
  },

  getCustomerFromAadharAndMobile: function(aadhar, mobile, callback) {
    Customer.findOne({
      'aadhar': aadhar,
      'mobile': mobile
    }, callback);
  },
  getCustomerfromID: function(id, callback) {
    console.log(id);
    Customer.findOne({
      '_id': id
    }, callback);
  }

};
