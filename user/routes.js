var session = require('express-session');
var user = require('./impl');

module.exports = function(app) {
  app.get('/', user.getIndex);
  app.get('/signup', user.getSignup);
  app.post('/signup', user.postSignup);
  app.get('/login', user.getLogin);
  app.get('/customerlogin', user.getCustomerLogin);
  app.post('/customerlogin', user.postCustomerLogin);
  app.post('/login', user.postLogin);
  app.get('/roleselection', user.getRoleSelection);
  app.post('/profile', user.postRoleSelection);
  app.get('/profile', user.getProfile);
  app.get('/profiledetails', user.getProfileDetails);
  app.get('/logout', user.logout);
};
