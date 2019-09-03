var express = require('express');
var serverStatus = require('../index');
var request = require('supertest');
var app = express();
var { matchers } = require('jest-json-schema');
var schema = require('./schema.json');

expect.extend(matchers);
app.use('/status', serverStatus(app));

app.get('/', function(req, res) {
  res.send('Homepage');
});

app.get('/slow', function(req, res) {
  setTimeout(function() {
    res.send('slow');
  }, 1000);
});

app.get('/groups/:slug', function(req, res) {
  res.send('Hello ' + req.params.slug);
});

app.listen(process.env.PORT || 3001);

describe('express-server-status', () => {
  test('/status', () => {
    request(app.get('/status')).expect(200, res => {
      expect(res.body).toMatchSchema(schema);
    });
  });
});
