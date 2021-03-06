var config = require('../config.js');
var Web3 = require('web3');
var web3 = new Web3();
var Trade = require('../trade/model');
web3.setProvider(new web3.providers.HttpProvider(config.web3Provider));
var session = require('express-session');
var userdb = require('./db');
var file = require('../file/impl');
var Registry = require('../registry/model.js');
var registrydb = require('../registry/db.js');
var registryFunctions = require('../contracts/registry/registry.js');
var manufacturerIdList, tradeIdArr, dealerIdList, supplierIdList, statusList, registryAddress;

checkIfRegistryDeployed(registryAddress);
registryAddress = config.registryAddress;

module.exports = {

  getIndex: function(req, res) {
    res.render('index.ejs');
  },

  getSignup: function(req, res) {
    res.render('signup.ejs', {
      message: req.session.message
    });
  },

  postSignup: function(req, res) {
    //Signup Code
    console.log('Signup Process - Generating IPFS Hash for KYC Docs....');
    userdb.findUserByUsername(req.body.username, req, res, ifUserFound.bind({
      'req': req,
      'res': res
    }));
  }, //End Of Signup Code

  getLogin: function(req, res) {
    res.render('login.ejs', {
      message: ""
    });
  },

  getCustomerLogin: function(req, res) {
    res.render('customerlogin.ejs');
  },

  postCustomerLogin: function(req, res) {
    res.render('customerlogin.ejs');
  },

  postLogin: function(req, res) {
    userdb.findUserByUsername(req.body.username, req, res, onFindUserLogin.bind({
      'req': req,
      'res': res
    }));
  },

  getProfile: function(req, res) {
    if (!req.session.userId) {
      res.redirect('/login');
    } else {
      userdb.findUserByUserID(req, res, onFindUserProfile.bind({
        'req': req,
        'res': res
      }));
    }
  },

  getRoleSelection: function(req, res) {
    res.render('roleselection.ejs');
  },

  postRoleSelection: function(req, res) {
    user = req.session.user;
    switch (user.role) {
      case 'Shipper':
        if (req.body.role == 'PARTSSUPPLIERTOOEM') {
          Trade.find({
            'type': 'PARTSSUPPLIERTOOEM'
          }, getListofTrades1.bind({
            'user': user,
            'res': res,
            'req': req
          }));
        } else if (req.body.role == 'OEMTODEALER') {
          Trade.find({
            'type': 'OEMTODEALER'
          }, getListofTrades2.bind({
            'user': user,
            'res': res,
            'req': req
          }));
        }
        break;
      case 'Manufacturer':
        console.log("case", req.body.role);
        if (req.body.role == 'PARTSSUPPLIERTOOEM') {
          Trade.find({
            'type': 'PARTSSUPPLIERTOOEM'
          }, getListofTrades1.bind({
            'user': user,
            'res': res,
            'req': req
          }));
        } else if (req.body.role == 'OEMTODEALER') {
          Trade.find({
            'type': 'OEMTODEALER'
          }, getListofTrades2.bind({
            'user': user,
            'res': res,
            'req': req
          }));
        }
        break;
      case 'Dealer':
        if (req.body.role == 'OEMTODEALER') {
          Trade.find({
            'type': 'OEMTODEALER'
          }, getListofTrades2.bind({
            'user': user,
            'res': res,
            'req': req
          }));
        } else if (req.body.role == 'DEALERTOCUSTOMER') {
          Trade.find({
            'type': 'DEALERTOCUSTOMER'
          }, getListofTrades3.bind({
            'user': user,
            'res': res,
            'req': req
          }));
        }
    }
  },

  getProfileDetails: function(req, res) {
    req.session.message = "";
    if (!req.session.userId) {
      res.redirect('/login');
    } else {
      userdb.findUserByUserID(req, res, onFindUserProfileDetails.bind({
        'req': req,
        'res': res
      }));
    }
  },

  logout: function(req, res) {
    req.session.destroy(function() {
      res.cookie("login.sess", "", {
        expires: new Date()
      });
      res.redirect('/login');
    });
  }
};

function getArrFromTradeObject(tradeList, type) {
  var arr = new Array();
  for (var i = 0; i < tradeList.length; ++i) {
    var trade = tradeList[i];
    arr[i] = trade[type];
  }
  return arr;
}


function onFindUserLogin(err, user) {
  if (err) {
    console.error(err);
    return err;
  }
  var req = this.req;
  var res = this.res;
  if (!user) {
    res.render('login.ejs', {
      message: "No Such User exists!!!"
    });
  } // if the user is found but the password is wrong
  else if (!user.validPassword(req.body.password)) {
    res.render('login.ejs', {
      message: "Wrong Password!!!"
    }); // create the loginMessage and save it to session as flashdata
  } // all is well, return successful user
  else {
    req.session.userId = user._id;
    req.session.message = "";
    res.redirect('/profile');
  }
}

function onFindUserProfile(err, user) {
  if (err)
    return err;
  var req = this.req;
  var res = this.res;
  req.session.userAddress = user.ethereumAddress;
  var Trade = require('../trade/model');
  switch (user.role) {
    case "Bank":
      Trade.find({
        'bank_id': user.username
      }, getListofTrades1.bind({
        'user': user,
        'res': res,
        'req': req
      }));
      break;
    case "Shipper":
      req.session.user = user;
      res.render('roleselection.ejs', {
        'role': "Shipper"
      });
      //res.redirect('/roleselection');
      break;
    case "Supplier":
      Trade.find({
        'supplier_id': user.username
      }, getListofTrades1.bind({
        'user': user,
        'res': res,
        'req': req
      }));
      break;
    case "Manufacturer":
      req.session.user = user;
      res.render('roleselection.ejs', {
        'role': "Manufacturer"
      });
      //res.redirect('/roleselection');
      break;
    case "Dealer":
      req.session.user = user;
      res.render('roleselection.ejs', {
        'role': "Dealer"
      });
      //res.redirect('/roleselection');
      break;
    case "Insurer":
      req.session.user = user;
      Trade.find({
        'insurer_id': user.username
      }, getListofTrades3.bind({
        'user': user,
        'res': res,
        'req': req
      }));
      break;
  }
}

function onFindUserProfileDetails(err, user) {
  if (err)
    return err;
  var req = this.req;
  var res = this.res;
  res.render('profiledetails.ejs', {
    role: user.role,
    ethAddress: user.ethereumAddress,
    ethBalance: web3.eth.getBalance(user.ethereumAddress),
    username: user.username,
    kychash: user.kychash,
    user: user._id
  });
}

function getListofTrades1(err, tradeList) {
  if (err)
    return err;
  req = this.req;
  res = this.res;
  user = this.user;
  if (tradeList.length > 0) {
    tradeIdArr = getArrFromTradeObject(tradeList, 'trade_id');
    supplierIdList = getArrFromTradeObject(tradeList, 'supplier_id');
    manufacturerIdList = getArrFromTradeObject(tradeList, 'manufacturer_id');
    statusList = getArrFromTradeObject(tradeList, 'status');
  } else {
    tradeIdArr = ['No Trades Yet'];
    supplierIdList = [];
    manufacturerIdList = [];
    statusList = [];
  }
  res.render('profile1.ejs', {
    message: req.session.message,
    role: user.role,
    ethAddress: user.ethereumAddress,
    ethBalance: web3.eth.getBalance(user.ethereumAddress),
    username: user.username,
    kychash: user.kychash,
    user: user._id,
    trade_id: tradeIdArr,
    supplierList: supplierIdList,
    manufacturerList: manufacturerIdList,
    statusList: statusList
  });
}

function getListofTrades2(err, tradeList) {
  console.log("In");
  if (err)
    return err;
  req = this.req;
  res = this.res;
  user = this.user;
  if (tradeList.length > 0) {
    tradeIdArr = getArrFromTradeObject(tradeList, '_id');
    dealerIdList = getArrFromTradeObject(tradeList, 'dealer_id');
    manufacturerIdList = getArrFromTradeObject(tradeList, 'manufacturer_id');
    statusList = getArrFromTradeObject(tradeList, 'status');
  } else {
    tradeIdArr = ['No Trades Yet'];
    dealerIdList = [];
    manufacturerIdList = [];
    statusList = [];
  }
  console.log(tradeIdArr);
  console.log('------------');
  console.log(manufacturerIdList);
  console.log(manufacturerIdList);
  console.log(dealerIdList[0]);
  res.render('profile2.ejs', {
    message: req.session.message,
    role: user.role,
    ethAddress: user.ethereumAddress,
    ethBalance: web3.eth.getBalance(user.ethereumAddress),
    username: user.username,
    kychash: user.kychash,
    user: user._id,
    trade_id: tradeIdArr,
    dealerList: dealerIdList,
    manufacturerList: manufacturerIdList,
    statusList: statusList
  });
}

function getListofTrades3(err, tradeList) {
  if (err)
    return err;
  req = this.req;
  res = this.res;
  user = this.user;
  if (tradeList.length > 0) {
    var tradeIdArr = getArrFromTradeObject(tradeList, '_id');
    insurerIdList = getArrFromTradeObject(tradeList, 'insurer_id');
    dealerIdList = getArrFromTradeObject(tradeList, 'dealer_id');
    customerIdList = getArrFromTradeObject(tradeList, 'customer_id');
    statusList = getArrFromTradeObject(tradeList, 'status');
  } else {
    tradeIdArr = ['No Trades Yet'];
    dealerIdList = [];
    insurerIdList = [];
    customerIdList = [];
    statusList = [];
  }
  console.log(customerIdList);
  console.log(tradeIdArr);
  console.log(dealerIdList);
  res.render('profile3.ejs', {
    message: req.session.message,
    role: user.role,
    ethAddress: user.ethereumAddress,
    ethBalance: web3.eth.getBalance(user.ethereumAddress),
    username: user.username,
    kychash: user.kychash,
    user: user._id,
    trade_id: tradeIdArr,
    dealerList: dealerIdList,
    customerList: customerIdList,
    statusList: statusList
  });
}

function ifUserFound(err, user) {
  req = this.req;
  res = this.res;
  if (err)
    throw err;
  else if (user) {
    res.render('signup.ejs', {
      'message': "User Already Exists!"
    });
  } else {
    file.fileupload(req, res, onKYCUpload.bind({
      'req': req,
      'res': res
    }));
  }
}

function onKYCUpload(err, hash) {
  req = this.req;
  res = this.res;
  console.log(hash);
  //Create New Ethereum Account for User and store in DB
  userdb.createNewUser(web3.personal.newAccount(req.body.password), hash[0].hash, req, res, onCreateNewUserCallback.bind({
    'req': req,
    'res': res,
    'hash': hash
  }));
}

function onCreateNewUserCallback(err, user) {
  req = this.req;
  res = this.res;
  hash = this.hash;
  registryFunctions.submitKYC(req, res, registryAddress, "", user.ethereumAddress, hash[0].hash, redirectOnUpload.bind({
    'req': req,
    'res': res,
    'user': user
  }));
}

function checkIfRegistryDeployed(registryAddress) {
  Registry.findOne({
    'deployed': 'Yes'
  }, function(err, Registry) {
    if (err)
      return err;
    if (Registry) {
      console.log('Registry Contract Already Deployed; Fetching from MONGO DB...');
      registryAddress = Registry.contract_id;
      console.log('Address of registry contract deployed:', registryAddress);
    } else {
      console.log('Deploying Registry Contract....');
      registryFunctions.deployRegistry();
    }
  });
}

function redirectOnUpload(err, user) {
  var req = this.req;
  var res = this.res;
  var user = this.user;
  req.session.userId = user._id;
  res.redirect('/profile');
}
