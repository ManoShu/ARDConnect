const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');

const serial = require('./serial_handler');

const wsServer = https.createServer({
  cert: fs.readFileSync('localhost.cert'),
  key: fs.readFileSync('localhost.key')
});
const wss = new WebSocket.Server({ server: wsServer });

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    if (message.startsWith("P")) {
      serial.setup(message);
    }
    else {
      serial.handleMessage(message);
    }
  });
  console.log('Client connected.');
});

module.exports = {
  start: function () {
    wsServer.listen(61000);
    console.log("Websocket wsServer running.");
  }
};


