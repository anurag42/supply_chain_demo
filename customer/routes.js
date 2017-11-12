var session = require('express-session');
var customer = require('./impl');

module.exports = function(app) {
    app.post('/validateAadhar', customer.validateAadhar);
    app.get('/customerlogin', customer.customerLogin);
    app.post('/validateOTP', customer.validateOTP);
};
