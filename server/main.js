const webServer = require('./web_server');
const wssServer = require('./ws_server');
const serial = require('./serial_handler');

serial.listPorts();
webServer.start();
wssServer.start();