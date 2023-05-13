/**
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */
const fs = require('fs');
const https = require('https');
const express = require('express');
const WebSocket = require('ws');
const xhub = require('express-x-hub');

const app = express();
const port = process.env.PORT || 5000;

// Set up HTTPS server
const server = https.createServer({
  key: fs.readFileSync('./private.key'), // Replace with the path to your SSL/TLS private key file
  cert: fs.readFileSync('./certificate.csr'), // Replace with the path to your SSL/TLS certificate file
}, app);

app.use(xhub({ algorithm: 'sha1', secret: process.env.APP_SECRET }));

const token = process.env.TOKEN || 'token';
const received_updates = [];

// Create a WebSocket server
const wss = new WebSocket.Server({ server });

// Handle WebSocket connections
wss.on('connection', function connection(ws) {
  console.log('WebSocket connected');

  // Handle WebSocket events here

  ws.on('message', function incoming(message) {
    console.log('Received message:', message);

    // Process the WebSocket message here

    // Broadcast the message to all connected clients
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });

    // Invoke an action on your Android app here by sending the message to your app via a push notification or some other mechanism
  });

  ws.on('close', function close() {
    console.log('WebSocket closed');

    // Clean up resources or perform any necessary actions when a WebSocket connection is closed
  });
});

app.get('/', function (req, res) {
  console.log(req);
  res.send('<pre>' + JSON.stringify(received_updates, null, 2) + '</pre>');

  // Broadcast the changes to connected WebSocket clients
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(received_updates));
    }
  });
});

app.get('/init', function (req, res) {
  res.json({ "Message": "Initialized" });
});

app.get(['/facebook', '/instagram'], function (req, res) {
  if (
    req.query['hub.mode'] == 'subscribe' &&
    req.query['hub.verify_token'] == token
  ) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(400);
  }
});

app.post('/facebook', function (req, res) {
  console.log('Facebook request body:', req.body);

  if (!req.isXHubValid()) {
    console.log('Warning - request header X-Hub-Signature not present or invalid');
    res.sendStatus(401);
    return;
  }

  console.log('request header X-Hub-Signature validated');
  // Process the Facebook updates here
  received_updates.unshift(req.body);
  res.sendStatus(200);
});

app.post('/instagram', function (req, res) {
  console.log('Instagram request body:');
  console.log(req.body);
  // Process the Instagram updates here
  received_updates.unshift(req.body);
  res.sendStatus(200);
});

server.listen(port, function () {
  console.log(`Server is listening on port ${port}`);
});

