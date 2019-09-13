var os = require('os');
var fs = require('fs');
var moment = require('moment');
var initStats = require('@phil-r/stats');
var requests = { total: 0 };
var requests_per_minute = [];
var assert = require('assert');

for (var i = 0; i < 60; i++) requests_per_minute[i] = 0;

var uptime_start = new Date();
var exec = require('child_process').exec;
var git_data = {};
exec(__dirname + '/lib/get_git_data.sh', function(err, res, stderr) {
  var cols = res.trim().split(',');
  git_data.branch = cols[0];
  git_data.sha = cols[1] && cols[1].substr(0, 7);
});

var sum = function(arr, from, length) {
  var total = 0;
  for (var i = from - length; i < from; i++) {
    total += arr[(i + arr.length) % arr.length];
  }
  return total;
};

var average = function(arr, from, length) {
  var total = sum(arr, from, length);
  return Math.round(total / arr.length);
};

var resetCounter = function() {
  var minute = new Date().getMinutes();
  requests_per_minute[(minute + 1) % 59] = 0;
};
// Every minute, we reset the oldest entry
setInterval(resetCounter, 60 * 1000);

module.exports = function(app, options) {
  options = options || {};
  options = Object.assign(
    {
      endpointStats: true,
      complexEndpoints: [],
      customStats: true,
      addHeader: true,
      server: true,
      git: true,
      node: true,
      system: true
    },
    options
  );

  assert(
    typeof options === 'object' && options != null,
    'options must be an object'
  );

  assert(
    Object.prototype.toString.call(options.complexEndpoints) ===
      '[object Array]',
    'options.complexEndpoints must be an array of path params'
  );

  assert(
    typeof options.endpointStats === 'boolean',
    'options.customStats must be a boolean'
  );

  assert(
    typeof options.customStats === 'boolean',
    'options.customStats must be a boolean'
  );

  assert(
    typeof options.addHeader === 'boolean',
    'options.addHeader must be a boolean'
  );

  assert(
    typeof options.system === 'boolean',
    'options.system must be a boolean'
  );

  assert(typeof options.node === 'boolean', 'options.node must be a boolean');

  assert(typeof options.git === 'boolean', 'options.git must be a boolean');

  assert(
    typeof options.server === 'boolean',
    'options.server must be a boolean'
  );

  var { statsMiddleware, getStats } = initStats(options);

  var server = { status: 'up' };

  var filepath = 'package.json';
  var i = 0;
  do {
    filepath =
      require.main.paths[i++].replace(/\/[^\/]*$/, '/') + 'package.json';
  } while (!fs.existsSync(filepath) && i < require.main.paths.length);

  try {
    var pkg = require(filepath);
    server.name = pkg.name;
    server.version = pkg.version;
  } catch (e) {
    console.error('express-server-status> Error loading ' + filepath, e);
  }

  app.use(statsMiddleware);

  app.get('*', function(req, res, next) {
    requests.total++;
    var minute = new Date().getMinutes();
    requests_per_minute[minute]++;
    return next();
  });

  return function(req, res, next) {
    req.stats = {};
    req.stats.start = new Date();

    // @decorate response#end method from express
    var end = res.end;
    res.end = function() {
      req.stats.responseTime = new Date() - req.stats.start;
      // call to original express#res.end()
      res.setHeader('X-Response-Time', req.stats.responseTime);
      end.apply(res, arguments);
    };

    var minute = new Date().getMinutes();
    server.started_at = moment(uptime_start);
    server.uptime = Math.round((new Date() - uptime_start) / 1000);
    server.uptime_human = moment(uptime_start).fromNow();
    server.env = process.env.NODE_ENV;

    var node = {
      version: process.version,
      memoryUsage: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'M',
      uptime: process.uptime()
    };

    var system = {
      loadavg: os.loadavg(),
      freeMemory: Math.round(os.freemem() / 1024 / 1024) + 'M',
      hostname: os.hostname()
    };

    // requests.per_minute = requests_per_minute;
    requests.last_minute = sum(requests_per_minute, minute, 1);
    requests.last_5mn_avg = sum(requests_per_minute, minute, 5);
    requests.last_15mn_avg = average(requests_per_minute, 0, 15);
    server.requests = requests;

    const stats = getStats();
    server.uptimeHumanReadable = stats.uptimeHumanReadable;
    server.endpointStats = stats.endpointStats;
    server.customStats = stats.customStats;

    delete stats.uptime;
    delete server.uptime_human;
    delete stats.uptimeHumanReadable;
    delete stats.count;
    delete stats.endpointStats;
    delete stats.customStats;

    const status = {};

    if (options.server) {
      status.server = Object.assign(server, stats);
    }

    if (options.node) {
      status.node = node;
    }

    if (options.system) {
      status.system = system;
    }

    if (options.git) {
      status.git = git_data;
    }

    res.json(status);
  };
};
