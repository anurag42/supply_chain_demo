var daemonstatus = false;
const IPFS = require('ipfs-daemon');
var ipfsdaemon;
var ipfsApi, ipfs;
var fs = require("fs");
module.exports = {

  download: function(hash, res) {
    ipfs.get(hash, function(err, stream) {
      if (err) {
        console.error(err);
        res.send("Oops!! We are having trouble connecting to the IPFS Server");
      }
      res.writeHead(200, {
        'Content-Disposition': 'attachment'
      });
      stream.on('data', (file) => {
        // write the file's path and contents to standard out
        file.content.pipe(res);
      });
    });

  },
  upload: function(data, callback) {
    console.log("IPFS UPLOAD BEING DONE");
    ipfs.add(new Buffer(data), callback);
  },
  getIPFS: function() {
    if (ipfsdaemon != null) {
      return ipfsdaemon;
    }
    ipfsdaemon = new IPFS();
    ipfsApi = require('ipfs-api');
    ipfs = ipfsApi({
      host: '127.0.0.1',
      port: '5001',
      protocol: 'http'
    });
    ipfsdaemon.on('error', (e) => console.error(err));

    ipfsdaemon.on('error', function() {
      daemonstatus = false;
      console.log("IPFS daemon is not ready to be used. Starting IPFS daemon again!!!");
    });
    ipfsdaemon.on('stop', function() {
      daemonstatus = false;
      console.log("IPFS daemon is stopped !!!")
    });
    ipfsdaemon.on('start', function() {
      console.log("IPFS daemon is started again");
    });
    ipfsdaemon.on('ready', function() {
      daemonstatus = true;
      console.log("IPFS daemon is ready to be used")
    });
  }
}
