var modeler = require('modeler');

module.exports = function (_opts) {
  var api = modeler(_opts);

  if (!api.options.client) throw new Error('must pass a mysql client with options.client');
  var client = api.options.client;
  var table = api.options.table || api.options.name;
  var serialPrefix = api.options.serialPrefix || '~s:';

  api._tail = function (limit, cb) {
    if (limit) limit = ' LIMIT ' + limit;
    else limit = '';
    client.query('SELECT id FROM ?? ORDER BY __seq DESC' + limit, table, function (err, rows) {
      if (err) return cb(err);
      cb(null, rows.map(function (row) {
        return row.id;
      }))
    });
  };
  api._save = function (entity, cb) {
    var c = api.copy(entity);
    var errored = false;
    Object.keys(c).forEach(function (k) {
      if (errored) return;
      if (k === 'created' || k === 'updated') {
        c[k] = c[k].getTime();
      }
      switch (typeof c[k]) {
        case 'boolean':
        case 'object':
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
        else if (k === 'created' || k === 'updated') {
          entity[k] = new Date(entity[k]);
        }
        else if (entity[k] === null) {
          delete entity[k];
        }
      });
      cb(null, entity);
    });
  };
  api._destroy = function (id, cb) {
    client.query('DELETE FROM ?? WHERE id = ?', [table, id], cb);
  };

  return api;
};
