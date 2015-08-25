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

  function mocksForRequest(req) {
    var method = req.headers['mock-method'] || 'GET';

    if(typeof mocks[method] === 'undefined')
      mocks[method] = {};

    return mocks[method];
  }

  return function (req, res, next) {
    var body = '';
    if (req.method === 'POST' && req.url.indexOf('/mock') === 0) {
      var path = req.url.substring(5);

      req.on('data', function (data) {
        body += data;
      });
      req.on('end', function () {

      	var limit = 0;

        var headers = {
          'Content-Type': req.headers['content-type']
        };
        for (var key in req.headers) {
          if (req.headers.hasOwnProperty(key)) {
            if (key.indexOf('mock-header-') === 0) {
              headers[key.substring(12)] = req.headers[key];
            }
            if ('mock-limit' === key) {
              limit = parseInt(req.headers[key]);
            }
          }
        }

        var m = mocksForRequest(req);
        var mockId = nextId();
        m[path] = {
          body: body,
          responseCode: req.headers['mock-response'] || 200,
          headers: headers,
          limit: limit,
          id: mockId
        };

        mocksById[mockId] = {
          path: path,
          method: req.headers['mock-method'] || 'GET'
        };

        res.writeHead(200);
        res.write("" + mockId);
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
      var mockedResponse = mocks[req.method][req.url];
      if (mockedResponse) {
        res.writeHead(mockedResponse.responseCode, mockedResponse.headers);
        res.write(mockedResponse.body);
        res.end();
        if (mockedResponse.limit > 0) {
          mockedResponse.limit--;
          if (mockedResponse.limit === 0) {
            remove(mockedResponse.id);
          }
        }
      } else {
        next();
      }
    }
  };
};
