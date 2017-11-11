var session = require('express-session');
const MongoStore = require('connect-mongo')(session);
var user = require('./impl');

module.exports = function(app) {
  app.get('/', user.getIndex);
  app.get('/signup', user.getSignup);
  app.post('/signup', user.postSignup);
  app.get('/login', user.getLogin);
  app.post('/login', user.postLogin);
  app.get('/roleselection', user.getRoleSelection);
  app.post('/profile', user.postRoleSelection);
  app.get('/profiledetails', user.getProfileDetails);
  app.get('/profile', user.getProfile);
  app.get('/logout', user.logout);
};
