
/*!
 * express-trace
 * Copyright(c) 2011 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var http = require('http');
var Layer = require('express/lib/router/layer');

/**
 * Export trace function.
 */

exports = module.exports = trace;

/**
 * Library version.
 */

exports.version = '0.0.3';

/**
 * Status code color map.
 */

var colors = {
    2: 32
  , 3: 36
  , 4: 33
  , 5: 31
};

/**
 * Trace middleware in the given `app`.
 *
 * @param {express.HTTPServer} app
 * @api public
 */

function trace(app) {
  var stack = (app._router && app._router.stack) || app.stack
    , len = stack.length;

  for (var i = 0; i < len; ++i) {
    stack[i].handle = (function(route, fn){

      // regular middleware
      return function(req, res, next){
        var route = route || '/'
          , name = fn.name || 'anonymous'
          , router = 'router' == fn.name
          , start = new Date;
        // middleware
        req.__trace = concat(req.__trace, '\n  \033[90mmiddleware \033[33m'
          + route + ' \033[36m'
          + name + '\033[0m'
          + (router ? '\n' : ' '));

        // duration
        fn(req, res, function(err){
          var str = fmt((router ? '  ' : '')
            + '\033[90m%dms\033[0m', new Date - start);
          req.__trace = concat(req.__trace, str);
          next(err);
        });
      }
    })(stack[i].route, stack[i].handle);
  }

  stack.unshift(new Layer('/', {
    sensitive: this.caseSensitive,
    strict: false,
    end: false
  }, printRouteStart));

  stack.push(new Layer('/', {
    sensitive: this.caseSensitive,
    strict: false,
    end: false
  }, noopMw));

  stack.push(new Layer('/', {
    sensitive: this.caseSensitive,
    strict: false,
    end: false
  }, setReqErr));

  function printRouteStart (req, res, next){
    var start = new Date;
    req.what = 1;
    var to = setTimeout(function () {
      console.error('TIMEDOUT!', req.__trace);
    }, 5*1000);
    res.on('finish', function(){
      clearTimeout(to);
      var color = colors[res.statusCode / 100 | 0];
      var str = fmt('\n  \033[90mresponded to %s \033[33m%s\033[0m '
        + '\033[90min %dms with \033[' + color + 'm%s\033[0m'
        + ' \033[90m"%s"\033[0m'
        , req.method
        , req.url
        , new Date - start
        , res.statusCode
        , http.STATUS_CODES[res.statusCode]);
      req.__trace = concat(req.__trace, str);
      console.error(req.__trace);
    });

    var str = fmt('\n  \033[90m%s \033[33m%s\033[0m', req.method, req.url);
    req.__trace = concat(req.__trace, str);

    next();
  }
  function noopMw (req, res, next){
    next();
  }
  function setReqErr (err, req, res, next) {
    req.__err = err;
    next(err);
  }
};

function concat () {
  return Array.prototype.reduce.call(arguments, function (a, b) {
    a = a || '';
    b = b || '';
    return a + b;
  });
}
function fmt (str) {
  var args = Array.prototype.slice.call(arguments, 1);
  return args.reduce(function (str, arg) {
    return str.replace(/%[sd]/, arg);
  }, str);
}
