var session = require('express-session');
const MongoStore = require('connect-mongo')(session);
var trade = require('./impl');

module.exports = function(app) {
  app.post('/triggertrade', trade.middleware1);
  app.post('/triggertradenew', trade.triggertradenew)
  app.post('/triggertrade1', trade.middleware2);
  app.post('/resumetrade1', trade.resumetrade1);
  app.post('/resumetrade2', trade.resumetrade2);
  app.get('/tradesession', trade.getTradeSession);
  app.post('/uploadDoc', trade.uploadDoc);
  app.post('/approvetrade', trade.approvetrade);
  app.post('/rejecttrade', trade.rejecttrade);
};
