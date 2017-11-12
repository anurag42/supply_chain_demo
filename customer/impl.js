var config = require('../config.js');
var Web3 = require('web3');
var web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider(config.web3Provider));
var session = require('express-session');
var customerdb = require('./db');
const SendOtp = require('sendotp');

module.exports = {

  validateAadhar: function(req, res) {
    var aadhar = req.body.aadhar;
    customerdb.getCustomerFromAadhar(aadhar, validateMobile.bind({
      'req': req,
      'res': res
    }));
  },

  customerLogin: function(req, res) {
    res.render('customerlogin.ejs');
  },

  validateOTP: function(req, res) {
    var otp = req.body.otp;
    var mobile = '91' + req.body.mobile;
    const sendOtp = new SendOtp(config.MSG91_AUTH_KEY);
    sendOtp.verify(mobile, otp, function(error, data, response) {
      if (error) {
        res.send({
          success: "false",
          message: "Invalid OTP"
        });
      }
      res.send({
        success: "true"
      });
    });
  },

  successfulLogin: function(req, res) {
    var aadhar = req.body.aadhar;
    customerdb.getCustomerFromAadhar(aadhar, navigateToTrackerPage.bind({
      'req': req,
      'res': res
    }));
  }

}

function navigateToTrackerPage(err, customer) {
  if (err || !customer) {
    console.log(err);
    return err;
  }
  var customerID = customer._id;
  res.redirect('/resumetrade?customerid=' + customerID);
}

function validateMobile(err, customer) {
  if (err || !customer) {
    console.error(err);
    this.res.send({
      success: "false",
      message: "Customer with this Aadhar number does not exist!"
    });
  }

  var mobile = "91" + customer.mobile;
  const sendOtp = new SendOtp(config.MSG91_AUTH_KEY);
  sendOtp.send(mobile, "ZEONBC", function(error, data, response) {
    console.log(error);
    console.log(data);

  });
  this.res.send({
    success: "true",
    mobile: mobile
  });

}
