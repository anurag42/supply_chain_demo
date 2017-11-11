var events = require('events');
var eventEmitter = new events.EventEmitter();
var Web3 = require('web3');
var web3 = new Web3();
var config = require('../config.js');
web3.setProvider(new web3.providers.HttpProvider(config.web3Provider));
var Scheduler = require('mongo-scheduler');
var scheduler = new Scheduler("mongodb://localhost/db_name", {
  doNotFire: false
});
var letterofcredit = require('../contract\ functions/letterOfCredit.js');
var tradedb = require('../trade/db');

module.exports = {
  paymentScheduler: function(locInstance, time, days, tradeID) {
    scheduler.on('PaymentProcessor', function() {
      payToSeller(locInstance, tradeID);
      console.log('Scheduled');
    });

    var payEvent = {
      name: 'PaymentProcessor',
      after: new Date((time * 1000 + (days * 60 * 1000)))
    };

    scheduler.schedule(payEvent);
  },

  IsDocUploadComplete: function(req, res) {
    var completedDocs = 0;
    console.log("CompletedDocs", completedDocs);
    //Each time a doc is uploaded onto Blockchain, event increments the count
    //Check if Doc Upload is complete; If so, redirect to profile page.
    eventEmitter.on('IsDocUploadComplete', function() {
      ++completedDocs;
      console.log("Upload Done", completedDocs);
      console.log(req.files.length);
      if (completedDocs == req.files.length) {
        userdb.findUserByUsername(req.body.username, req, res, function(err, user) {
          req.session.userId = user._id;
          console.log("Session", req.session);
          res.redirect('/profile');
        });
      }
    });
  },

};

function payToSeller(locInstance, id) {
  console.log('Payment Initiated');
  gasUsage = locInstance.pay.estimateGas();
  var params = {
    gas: gasUsage,
    gasPrice: config.gasPrice,
    from: config.ethAddress
  };
  locInstance.pay.sendTransaction(params, function(err, result) {
    if (err) {
      console.error(err);
      res.send(err);
      return;
    }
    watchPayment(locInstance, id);
  });
}

function watchPayment(locInstance, id) {
  locInstance.LogPayment().watch(function(e, log) {
    if (e) {
      return console.error(e);
    }
    locInstance.LogPayment().stopWatching();
    console.log('Payment triggered from LOC contract');
    var query = {
      trade_id: id
    };
    var update;
    if (log.args.s == "True") update = {
      status: 'Payment Successful'
    };
    else if (log.args.s == "False") update = {
      status: 'Payment Declined'
    };
    tradedb.updateTrade(query, update);
  });
}
