const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');

//require('https').globalAgent.options.ca = require('ssl-root-cas/latest').create();

const serial = require('./serial_handler');

const wsServer = https.createServer({
  cert: fs.readFileSync('localhost.cert'),
  key: fs.readFileSync('localhost.key')
});
const wss = new WebSocket.Server({ server: wsServer });

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    serial.handleMessage(message);
  });
});

function responseReceived(theMessage) {
  wss.clients.forEach(function each(client) {
    if (client.readyState == WebSocket.OPEN) {
      client.send(theMessage);
    }
  });
}

module.exports = {
  start: function (wssPort, comPort) {
    serial.setup(comPort,
      //message received
      function (response) {
        responseReceived(response);
      },
      //board connected
      function () {
        wsServer.listen(wssPort);
        console.log("Websocket server running on port %i.", wssPort);
      });
  }
};


