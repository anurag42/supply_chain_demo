var Customer = require('./model');
var session = require('express-session');
module.exports = {

  getCustomerFromAadhar: function(aadhar, callback) {
    Customer.findOne({
      'aadhar': aadhar
    }, callback);
  },

  createNewCustomer: function(aadhar, mobile, callback) {
    var newCustomer = new Customer();
    newCustomer.aadhar = aadhar;
    newCustomer.mobile = mobile;
    newCustomer.save(callback);
  }

};
