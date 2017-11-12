var express = require('express');
var mongoose = require('mongoose');
var path = require('path');
var ejs = require('ejs');
var bodyParser = require('body-parser');
var multer = require('multer');
var session = require('express-session');
var cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo')(session);
var app = express();
var port = process.env.PORT || 80;
app.set('view engine', 'ejs');
app.set('views', './views');

app.use(express.static(path.join(__dirname, 'styles')));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(cookieParser());
var ipfs = require('./file/ipfs');

app.use(session({
  key: 'login.sess',
  secret: 'login route',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 30
  },
  store: new MongoStore({
    host: '127.0.0.1',
    port: 27017,
    url: 'mongodb://127.0.0.1/db_name',
    collection: 'session'
  }),
  name: 'sess'
}));
app.use(function(req, res, next) {
  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  next();
});
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
app.use(multer({
  dest: '/var/www/supply_chain/temp'
}).any());



var config = require('./config.js');

mongoose.connect('mongodb://127.0.0.1/supplychain', {
  useMongoClient: true,
  /* other options */
});

// routes ======================================================================
require('./user/routes')(app);
require('./trade/routes')(app);
require('./file/routes')(app);
require('./customer/routes')(app);
console.log("Server started");
// launch ======================================================================
app.listen(port);
ipfs.getIPFS();
