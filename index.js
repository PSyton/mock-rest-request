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
  return function (req, res, next) {
    if (req.method === 'POST' && req.url.indexOf('/mock') === 0) {
      var path = req.url.substring(5);

      var body = '';
      req.on('data', function (data) {
        body += data;
      });
      req.on('end', function () {

        var headers = {
          'Content-Type': req.headers['content-type']
        };
        _.each(req.headers, function (value, key) {
          if (key.indexOf('mock-header-') === 0) {
            headers[key.substring(12)] = value;
          }
        });

        mocks[req.headers['mock-method'] || 'GET'][path] = {
          body: body,
          responseCode: req.headers['mock-response'] || 200,
          headers: headers
        };

        res.writeHead(200);
        res.end();
      });
    } else if (req.url.indexOf('/reset') === 0) {
      mocks[req.headers['mock-method'] || 'GET'][req.url.substring(6)] = null;
      res.writeHead(200);
      res.end();
    } else if (req.url.indexOf('/api') === 0) {
      var mockedResponse = mocks[req.method][req.url];
      if (mockedResponse) {
        res.writeHead(mockedResponse.responseCode, mockedResponse.headers);
        res.write(mockedResponse.body);
        res.end();
      } else {
        next();
      }
    } else {
      next();
    }
  };
};