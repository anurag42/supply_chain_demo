var session = require('express-session');
var customer = require('./impl');

module.exports = function(app) {
    app.post('/validateAadhar', customer.validateAadhar);
};
