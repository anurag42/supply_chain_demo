var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

// define the schema for our trade model
var registrySchema = mongoose.Schema({
              deployed      : {type: String, default: 'No'},
              contract_id   : String
});


// create the model for users and expose it to our app
module.exports = mongoose.model('Registry', registrySchema);
