var modeler = require('modeler');

module.exports = function (_opts) {
  var api = modeler(_opts);

  if (!api.options.client) throw new Error('must pass a mysql client with options.client');
  var client = api.options.client;
  var table = api.options.table || api.options.name;
  var serialPrefix = api.options.serialPrefix || '~s:';

  api._list = function (options, cb) {
    var offset = options.start || 0;
    var limit = options.stop && options.stop - offset || '18446744073709551610'; 
    client.query('SELECT id FROM ?? ORDER BY created DESC LIMIT ?, ?',
      [table, offset, limit], function (err, rows) {
        if (err) return cb(err);
        console.log(rows);
      });
  };
  api._save = function (entity, cb) {
    var c = api.copy(entity);
    var errored = false;
    Object.keys(c).forEach(function (k) {
      if (errored) return;
      switch (typeof c[k]) {
        case 'boolean':
        case 'object':
        if (c[k].getTime) return; // dates dealt with by node-mysql
        try {
          c[k] = serialPrefix + JSON.stringify(c[k]);
        }
        catch (e) {
          errored = true;
          return cb(e);
        }
      }
    });
    if (errored) return;
    //console.log('save', c);
    client.query('INSERT INTO ?? SET ? ON DUPLICATE KEY UPDATE ?', [table, c, c], cb);
  };
  api._load = function (id, cb) {
    client.query('SELECT * FROM ?? WHERE id = ? LIMIT 1', [table, id], function (err, rows) {
      if (err) return cb(err);
      if (!rows.length) return cb(null, null);
      var entity = rows.pop();

      Object.keys(entity).forEach(function (k) {
        if (typeof entity[k] === 'string' && entity[k].indexOf(serialPrefix) === 0) {
          try {
            entity[k] = JSON.parse(entity[k].replace(serialPrefix, ''));
          }
          catch (e) {
            errored = true;
            return cb(err);
          }
        }
      });
      //console.log('load', entity);
      cb(null, entity);
    });
  };
  api._destroy = function (id, cb) {
    client.query('DELETE FROM ?? WHERE id = ?', [table, id], cb);
  };

  return api;
};
