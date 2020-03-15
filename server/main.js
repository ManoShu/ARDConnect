const webServer = require('./web_server');
const wssServer = require('./ws_server');
const serial = require('./serial_handler');

const WSS_PORT = 54010;

if (process.platform === "win32") {
    var rl = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.on("SIGINT", function () {
        process.emit("SIGINT");
    });
}

process.on("SIGINT", function () {
    //graceful shutdown
    if (serial.isOpen()) {
        console.log("disconnecting...");
        serial.disconnect();
    }
    process.exit();
});

serial.selectPort(function (comPort) {
    console.log("Starting comm on '%s'...", comPort);
    wssServer.start(WSS_PORT, comPort);
    webServer.start();
});