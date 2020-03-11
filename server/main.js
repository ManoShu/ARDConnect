const webServer = require('./web_server');
const wssServer = require('./ws_server');
const serial = require('./serial_handler');

serial.selectPort(function (comPort) {
    webServer.start();
    console.log("Starting comm on '%s'", comPort);
    wssServer.start(comPort);
});
//serial.listPorts();
