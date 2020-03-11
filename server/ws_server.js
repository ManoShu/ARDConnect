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
    if (message.startsWith("R")) {
      serial.setup(message, function (response) {
        responseReceived(ws, response);
      });
      ws.send("R");
    }
    else {
      serial.handleMessage(message);
    }
  });
  console.log('Client connected.');
});

function responseReceived(server, theMessage) {
  //console.log(theMessage);
  server.send(theMessage);
}

module.exports = {
  start: function (comPort) {
    serial.setPort(comPort);
    wsServer.listen(61000);
    console.log("Websocket wsServer running.");
  }
};


