assert = require('assert');
util = require('util');
modeler = require('../');
idgen = require('idgen');

var client = require('mysql').createConnection({
  host: 'localhost',
  user: 'root',
  password: ''
});
var testDb = 'modeler-mysql-test-' + idgen();

extraOptions = {
  client: client
};

setUp = function (done) {
  var latch = 2, errored = false;

  client.query('CREATE DATABASE ??', testDb, function (err) {
    if (err) return done(err);

    function tryDone (err) {
      if (errored) return;
      if (err) {
        errored = true;
        return done();
      }
      if (!--latch) done();
    }

    client.query('USE ??', testDb, function (err) {
      if (err) return done(err);
      client.query("CREATE TABLE IF NOT EXISTS `apples` ("
        + "`id` VARCHAR(255) NOT NULL,"
        + "`__seq` BIGINT NOT NULL AUTO_INCREMENT,"
        + "`created` BIGINT,"
        + "`updated` BIGINT,"
        + "`rev` INT,"
        + "`size` VARCHAR(255),"
        + "`condition` TEXT,"
        + "`type` VARCHAR(255),"
        + "`__internal` VARCHAR(255),"
        + "PRIMARY KEY (`__seq`),"
        + "UNIQUE KEY (`id`)"
        + ") ENGINE=InnoDB", tryDone);
      client.query("CREATE TABLE IF NOT EXISTS `oranges` ("
        + "`id` VARCHAR(255) NOT NULL,"
        + "`__seq` BIGINT NOT NULL AUTO_INCREMENT,"
        + "`created` BIGINT,"
        + "`updated` BIGINT,"
        + "`rev` INT,"
        + "PRIMARY KEY (`__seq`),"
        + "UNIQUE KEY (`id`)"
        + ") ENGINE=InnoDB", tryDone);
      });
  });
};

tearDown = function (done) {
  client.query('DROP DATABASE ??', testDb, function (err) {
    assert.ifError(err);
    extraOptions.client.end(done);
  });
};
