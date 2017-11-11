var Registry = require('./model.js');

module.exports = {
  saveRegistryAddress: function(address){
  var newRegistry = new Registry();
	newRegistry.deployed = 'Yes';
	newRegistry.contract_id = address;
	newRegistry.save(function(err) {
		if (err)
			throw err;
    console.log('Address of registry contract deployed:',address);
	});
}
};
