const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');

const server = https.createServer({
  cert: fs.readFileSync('localhost.cert'),
  key: fs.readFileSync('localhost.key')
});
const wss = new WebSocket.Server({ server });

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
  });

  ws.send('something');
});

module.exports = {
  start: function () {
    server.listen(8080);
    console.log("Websocket server running.");
  }
};


