const webServer = require('./web_server');
const wssServer = require('./ws_server');
const serial = require('./serial_handler');

const WSS_PORT = 54010;

serial.selectPort(function (comPort) {
    console.log("Starting comm on '%s'...", comPort);
    wssServer.start(WSS_PORT, comPort);
    webServer.start();
});