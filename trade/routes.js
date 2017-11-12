var session = require('express-session');
const MongoStore = require('connect-mongo')(session);
var trade = require('./impl');

module.exports = function(app) {
  app.post('/triggertrade', trade.middleware1);
  app.post('/triggertrade1', trade.middleware2);
  app.post('/triggertradenew', trade.triggertradenew);
  app.post('/resumetrade', trade.resumetrade);
  app.get('/resumetrade', trade.getresumetrade);
  app.get('/tradesession', trade.getTradeSession);
  app.post('/uploadDoc', trade.uploadDoc);
  app.post('/approvetrade', trade.approvetrade);
  app.post('/rejecttrade', trade.rejecttrade);
};
