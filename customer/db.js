var Customer = require('./model');
var session = require('express-session');
module.exports = {

  getCustomerFromAadhar: function(aadhar, callback) {
    console.log("DB CALL");
    Customer.findOne({
      'aadhar': aadhar
    }, callback);
  },
  createNewCustomer: function(aadhar, mobile, req, res, callback) {
    var newCustomer = new Customer();
    newCustomer.aadhar = aadhar;
    newCustomer.mobile = mobile;
    newCustomer.save(callback);
  }

}
