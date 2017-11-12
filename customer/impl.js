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

  validateKYC: function(req, res) {
    var mobile = req.body.mobile;
    var aadhar = req.body.aadhar;
    customerdb.getCustomerFromAadharAndMobile(aadhar, validateKYCCallback.bind({
      'req': req,
      'res': res,
      'aadhar': aadhar,
      'mobile': mobile
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
    console.log("OTP");
    var aadhar = req.body.aadhar;
    customerdb.getCustomerFromAadhar(aadhar, navigateToTrackerPage.bind({
      'req': req,
      'res': res
    }));
  }

}

function navigateToTrackerPage(err, customer) {
  console.log("LOG");
  if (err || !customer) {
    console.log(err);
    return err;
  }
  console.log("1");
  var res = this.res;
  var customerID = customer._id;
  res.redirect('/resumetrade?customerid=' + customerID + '&senderpage=Customer');
}

function validateKYCCallback(err, customer) {
  var res = this.res;
  if (err) {
    console.error(err);
    res.send({
      success: "false"
    });
  }

  var kycExists = true;
  if (!customer) {
    kycExists = false;
    customerdb.createNewCustomer(this.aadhar, this.mobile, function (response) {
      console.log(response);
    });
  }

  var kycHash = customer.kychash;
  if (!kycHash) {
    kycExists = false;
  }

  res.send({
    success: "true",
    kycExists: kycExists
  });

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
