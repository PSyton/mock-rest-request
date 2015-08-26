/**
 * Mock REST requests.
 *
 * See README.md for documentation of options.
 *
 * @param {Object} options
 * @return {Function} middleware
 * @api public
 */

module.exports = function mockRequests(options) {
  var mocks = {
    GET: {},
    PUT: {},
    POST: {},
    PATCH: {},
    DELETE: {}
  };

  var mocksById = {};

  var requestId = 0;

  function nextId() {
    return requestId++;
  }

  function remove(aRequestId) {
    var m = mocksById[aRequestId];
    if (m) {
      delete mocks[m.method][m.path];
      delete mocksById[aRequestId];
    }
  }

  function clean() {
    mocks = {
      GET: {},
      PUT: {},
      POST: {},
      PATCH: {},
      DELETE: {}
    };

    mocksById = {};
  }

  function getMethod(aReq) {
    return aReq.headers['mock-method'] || 'GET';
  }

  function mocksForRequest(req) {
    var method = getMethod(req);

    if(typeof mocks[method] === 'undefined')
      mocks[method] = {};

    return mocks[method];
  }

  function MockQueue(aId) {
    this.data = [];
    this.id = aId;
  }

  MockQueue.prototype.push = function(aData) {
    this.data.push(aData);
  };

  MockQueue.prototype.take = function() {
    var result = this.data[0];
    result.count--;
    if (result.count === 0) {
      this.data.splice(0, 1);
      result.last = (this.data.length === 0);
    }
    return result;
  };

  return function (req, res, next) {
    var body = '';
    if (req.method === 'POST' && req.url.indexOf('/mock') === 0) {
      var path = req.url.substring(5);

      req.on('data', function (data) {
        body += data;
      });
      req.on('end', function () {

      	var limit = 1;
        var headers = {
          'Content-Type': req.headers['content-type']
        };
        for (var key in req.headers) {
          if (req.headers.hasOwnProperty(key)) {
            if (key.indexOf('mock-header-') === 0) {
              headers[key.substring(12)] = req.headers[key];
            }
            if ('mock-limit' === key) {
              limit = parseInt(req.headers[key]) || 1;
            }
          }
        }

        var m = mocksForRequest(req);
        if (!m[path]) {
          m[path] = new MockQueue(nextId());
        }

        m[path].push({
          body: body,
          responseCode: req.headers['mock-response'] || 200,
          headers: headers,
          count: limit
        });

        mocksById[m[path].id] = {
          path: path,
          method: getMethod(req)
        };

        res.writeHead(200);
        res.write("" + m[path].id);
        res.end();
      });
    } else if (req.method === 'GET' && req.url.indexOf('/mock-reset') === 0) {
      var mockId = req.url.substring(11);
      if (mockId) {
        mockId = mockId.substring(1);
        remove(mockId);
      } else {
        clean();
      }
      res.writeHead(200);
      res.end();
    } else if (req.url.indexOf('/mock-list') === 0) {
      res.writeHead(200, {
        'Content-Type': 'text/plain'
      });
      for(var method in mocks) {
          res.write(method + ":\n");
          for(var p in mocks[method]) {
            res.write(" " + p + "\n");
          }
      }
      res.end();
    } else {
      var mockedQueue = mocks[req.method][req.url];
      if (mockedQueue) {
        var r = mockedQueue.take();
        res.writeHead(r.responseCode, r.headers);
        res.write(r.body);
        res.end();
        if (r.last) {
          remove(mockedQueue.id);
        }
      } else {
        next();
      }
    }
  };
};
