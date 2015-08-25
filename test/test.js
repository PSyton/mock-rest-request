var http = require('http');
var request = require('supertest');

var mockRequests = require('..');

describe('mockRequests()', function () {

  var server;

  beforeEach(function () {
    server = createServer({}, function (req, res) {
      res.end('not mocked');
    });
  });

  it('should not mock when no mocks are configured', function (done) {
    request(server)
      .get('/')
      .expect(200)
      .expect('not mocked', done);
  });

  describe('that mocks a GET request', function () {

    beforeEach(function () {
      request(server)
        .post('/mock/api')
        .send({mock: 'data'})
        .end(function () {});
    });

    it('should return the mocked content when the mocked path is requested', function (done) {
      request(server)
        .get('/api')
        .expect(200)
        .expect('{"mock":"data"}', done);
    });

    it('should return the normal content when another path is requested', function (done) {
      request(server)
        .get('/something')
        .expect(200)
        .expect('not mocked', done);
    });

    it('should not mock non GET (PUT) requests', function (done) {
      request(server)
        .put('/api')
        .expect(200)
        .expect('not mocked', done);
    });

    it('should not mock non GET (POST) requests', function (done) {
      request(server)
        .post('/api')
        .expect(200)
        .expect('not mocked', done);
    });
  });

  it('should allow a different status code', function (done) {
    request(server)
      .post('/mock/api')
      .set('mock-response', '500')
      .send({mock: 'data'})
      .end(function () {

      request(server)
        .get('/api')
        .expect(500)
        .expect('{"mock":"data"}', done);
    });

  });

  it('should allow a different method', function (done) {
    request(server)
      .post('/mock/api')
      .set('mock-method', 'POST')
      .send({mock: 'data'})
      .end(function () {

      request(server)
        .get('/api')
        .expect(200)
        .expect('not mocked');

      request(server)
        .post('/api')
        .expect(200)
        .expect('{"mock":"data"}', done);

    });

  });

  it('should stop mocking after a reset request', function (done) {
    var id;
    request(server)
      .post('/mock/api')
      .send({mock: 'data'})
      .end(function (err, res) {
        id = res.text;
        
        request(server)
          .get('/api')
          .expect(200)
          .expect('{"mock":"data"}');

        request(server)
          .get('/mock-reset/' + id)
          .end(function () {

          request(server)
            .get('/api')
            .expect(200)
            .expect('not mocked', done);

	});
      });
  });

  it('should stop mocking all after empty reset request', function (done) {
    var id;
    request(server)
      .post('/mock/api')
      .send({mock: 'data'})
      .end(function (err, res) {});

    request(server)
      .post('/mock/api2')
      .send({mock: 'data'})
      .end(function (err, res) {});

    request(server)
      .get('/api')
      .expect(200)
      .expect('{"mock":"data"}');

    request(server)
      .get('/api2')
      .expect(200)
      .expect('{"mock":"data"}');


    request(server)
      .get('/mock-reset')
      .end(function () {});


    request(server)
      .get('/api')
      .expect(200)
      .expect('not mocked', function() {

      request(server)
        .get('/api2')
        .expect(200)
        .expect('not mocked', done);

    });

  });

  it('should allow arbitrary methods', function (done) {
    request(server)
      .post('/mock/api')
      .set('mock-method', 'COPY')
      .send({mock: 'data'})
      .end(function () {});

    request(server)
      .get('/api')
      .expect(200)
      .expect('not mocked', function() {

      request(server)
        .copy('/api')
        .expect(200)
        .expect('{"mock":"data"}', done);
    });

  });

  it('should allow limit', function (done) {
    request(server)
      .post('/mock/api')
      .set('mock-limit', '1')
      .set('mock-method', 'GET')
      .send({mock: 'data'})
      .end(function () {});

    request(server)
      .get('/api')
      .expect(200)
      .expect('{"mock":"data"}', done);

    request(server)
      .get('/api')
      .expect(200)
      .expect('not mocked');
  });


  it('should list all mocked methods and paths', function (done) {
    request(server)
      .post('/mock/api')
      .send({mock: 'data'})
      .end(function () {

      request(server)
        .get('/api')
        .expect(200)
        .expect('{"mock":"data"}');

      request(server)
        .get('/mock-list')
        .expect(200)
        .expect('GET:\n /api\nPUT:\nPOST:\nPATCH:\nDELETE:\n', done);

    });

  });

});

function createServer(opts, fn) {
  var _mockRequests = mockRequests(opts);
  return http.createServer(function (req, res) {
    _mockRequests(req, res, function (err) {
      if (err) {
        res.statusCode = err.status || 500;
        res.end(err.message);
        return;
      }

      fn(req, res);
    });
  });
}
