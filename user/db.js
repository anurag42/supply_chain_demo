var User = require('./model');
var session = require('express-session');
module.exports = {

  findUserByUsername: function(username, req, res, callback) {
    User.findOne({
      'username': username
    }, callback);
  },
  findUserByUserID: function(req, res, callback) {
    User.findOne({
      '_id': req.session.userId
    }, callback);
  },
  createNewUser: function(account, hash, req, res, callback) {
    var newUser = new User();
    // set the user's credentials
    newUser.username = req.body.username;
    newUser.email = req.body.email;
    newUser.password = newUser.generateHash(req.body.password);
    newUser.role = req.body.role;
    newUser.kychash = hash[0].hash;
    newUser.ethereumaddress = account;
    newUser.save(callback);
  },
  updateUser: function(query, update) {
    var options = {
      multi: true
    };
    User.update(query, update, options, function(err, num) {
      console.log(num);
    });
  }
};
