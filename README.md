# express-server-status
Get a quick overview of the status of an express server (uptime, version, git sha, stats)

> Integrates https://github.com/phil-r/stats

## Installation

```sh
$ npm install express-server-status --save
```

## API

```js
const serverStatus = require('express-server-status')
app.use('/status', serverStatus(app, {
  endpointStats: true,
  complexEndpoints: ['/user/:id'],
  customStats: true,
  addHeader: true,
  server: true,
  git: true,
  node: true,
  system: true
}));;
```

### initStats([options])

Returns `statsMiddleware` middleware function and `getStats` function,
that returns current stats

#### Options

`initStats` accepts optional `options` object that may contain any of the following keys:

##### endpointStats

Defaults to `true`

Boolean that indicates whether to track per endpoint stats.

##### complexEndpoints

Defaults to `[]`

Used in conjunction with `endpointStats`

Use it in case your application has routes with params or wildcard routes

**Recommended** for applications that have endpoints like `/user/123`

##### customStats

Defaults to `true`

Adds `startMeasurement` and `finishMeasurement` functions to the request objects
and allows measuring any parts of the app.

**Usage:**

```js
function handler(req, res) {
  const measurement = req.startMeasurement('measurementName');
  // Some code...
  req.finishMeasurement(measurement);
}
```

##### addHeader

Defaults to `true`

Adds `X-Response-Time` header to all responses, can be used to replace
[`expressjs/response-time`](https://github.com/expressjs/response-time)


##### server

Defaults to `true`

##### git
##### node
##### system

    
## Usage

```js
var serverStatus = require('express-server-status');
var express = require('express');
var app = express();

// default options
const options = {
  endpointStats: true,
  complexEndpoints: [],
  customStats: true,
  addHeader: true,
  server: true,
  git: true,
  node: true,
  system: true
}

app.use('/status', serverStatus(app, options));

app.get('/long', async (req, res) => {
  const measurement = req.startMeasurement('long');
  await new Promise(resolve => {
    setTimeout(() => resolve(), 2000);
  });
  req.finishMeasurement(measurement);
  res.end(`Long job finished`);
});

app.listen(3000, () => {
  console.log('Server is running at http://localhost:3000');
});
```

## Example
 
`curl localhost:3000/status`

```json
{
  "server": {
    "status": "up",
    "description": "OpenCollective API",
    "version": "0.0.5",
    "uuid": "330d9cc6-7d40-4964-888c-4d2817905ee1",
    "pid": 90603,
    "totalTime": 4020.3912830000004,
    "averageTime": 446.7101425555556,
    "uptime": 63881,
    "uptimeHumanReadable": "1m 4s",
    "statusCodes": {
      "200": 5,
      "404": 4
    },
    "requests": {
      "total": 1,
      "last_minute": 0,
      "last_5mn_avg": 0,
      "last_15mn_avg": 0
    },
    "endpointStats": {
      "GET /long": {
        "totalTime": 4009.410922,
        "averageTime": 2004.705461,
        "count": 2,
        "statusCodes": {
          "200": 2
        }
      },
      "GET /favicon.ico": {
        "totalTime": 4.286955,
        "averageTime": 1.07173875,
        "count": 4,
        "statusCodes": {
          "404": 4
        }
      },
      "GET /stats": {
        "totalTime": 6.227342999999999,
        "averageTime": 6.227342999999999,
        "count": 1,
        "statusCodes": {
          "200": 1
        }
      },
      "GET /user/:id": {
        "totalTime": 0.466063,
        "averageTime": 0.2330315,
        "count": 2,
        "statusCodes": {
          "200": 2
        }
      }
    },
    "customStats": {
      "long": {
        "totalTime": 4005.556455,
        "averageTime": 2002.7782275,
        "started": 2,
        "count": 2
      }
    }
  },
  "git": {
    "branch": "master",
    "sha": "1f86caa"
  }
}
```
