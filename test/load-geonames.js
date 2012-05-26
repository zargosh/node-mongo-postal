// Parse command-line options:
var argv = require('optimist')
  .usage('Usage: $0 -f [geonamesFile] -c [configFile]')
  .demand(['f', 'c'])
  .alias('f', 'file')
  .describe('f', 'Absolute path to a Geonames postal codes file, e.g. /tmp/US.txt')
  .alias('c', 'config')
  .describe('c', 'Absolute path to a Javascript configuration file, e.g. /tmp/local.config.js')
  .argv
;

// Initialize a connection to MongoDB:
console.log("Using MongoDB settings in configuration file: %s", argv.config);
var config = require(argv.config);
var mongo = require('mongoskin');
var authStr = config.mongo.auth ? (config.mongo.auth.name + ':' + config.mongo.auth.pass) + '@' : '';
var connectStr = config.mongo.host + ':' + config.mongo.port + '/' + config.mongo.dbname;
var db = mongo.db(authStr + connectStr + '?auto_reconnect=true');

// Read the contents of the postal codes file and pass to our mongo postal db:
console.log("Reading postal codes from Geonames file: %s", argv.file);
var mongoPostal = require('../lib/node-mongo-postal');
var csv = require('csv');
csv()
.fromPath(argv.file, {
  delimiter : '\t',
  columns : [
    'country_code', 
    'postal_code', 
    'place_name', 
    'admin_name1', 
    'admin_code1', 
    'admin_name2', 
    'admin_code2', 
    'admin_name3', 
    'admin_code3', 
    'latitude', 
    'longitude', 
    'accuracy'
  ]
})
.transform(function(data, index) {
  return {
    country : data.country_code,
    zipcode : data.postal_code,
    city : data.place_name,
    state_long : data.admin_name1,
    state_short : data.admin_code1,
    latitude : data.latitude,
    longitude : data.longitude
  };  
})
.on('data', function(data, index) {
  mongoPostal.savePostalCode(db, data);
})
.on('end', function(count) {
  console.log('Number of postal codes: '+count);
})
.on('error', function(error) {
  console.error(error.message);
});
