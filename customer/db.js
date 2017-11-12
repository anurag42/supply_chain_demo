var Customer = require('./model');
var session = require('express-session');
module.exports = {

  getCustomerFromAadhar: function(aadhar, req, res, callback) {
    Customer.findOne({
      'aadhar': aadhar
    }, callback);
  }

}
