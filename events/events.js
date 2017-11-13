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
require('../build/ABI/tradeRegistry.js');
var tradeContract = web3.eth.contract(tradeRegistryABI);
var tradeRegistryAddress = config.tradeAddress;
var tradedb = require('../trade/db');

module.exports = {
  paymentScheduler: function(time, days, tradeID) {
    scheduler.on('PaymentProcessor', function() {
      payToSeller(tradeID);
      console.log('Scheduled');
    });

    var payEvent = {
      name: 'PaymentProcessor',
      after: new Date((time * 1000 + (days * 60 * 1000)))
    };

    scheduler.schedule(payEvent);
  }
};

function payToSeller(id) {
  console.log('Payment Initiated');
  var tradeInstance = tradeContract.at(tradeRegistryAddress);
  gasUsage = tradeInstance.payToSeller.estimateGas(id);
  var params = {
    gas: gasUsage,
    gasPrice: config.gasPrice,
    from: config.ethAddress
  };
  tradeInstance.pay.sendTransaction(id, params, function(err, result) {
    if (err) {
      console.error(err);
      res.send(err);
      return;
    }
    watchPayment(tradeInstance, id);
  });
}

function watchPayment(tradeInstance, id) {
  tradeInstance.LogPayment({
    'uid': id
  }).watch(function(e, log) {
    if (e) {
      return console.error(e);
    }
    console.log('Payment triggered from trade contract');
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
