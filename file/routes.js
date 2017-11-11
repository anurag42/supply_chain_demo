var session = require('express-session');
const MongoStore = require('connect-mongo')(session);
var file = require('./impl');
module.exports = function(app) {
  app.post('/filedownload', file.filedownload);
  app.post('/docdownload', file.docdownload);
  app.post('/docdownloadbc', file.docdownloadbc);
  app.post("/getKYChash", file.getKYChash);
  app.post("/letterOfCredit", file.letterOfCredit);
};
