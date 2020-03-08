const SerialPort = require('serialport');

var port = undefined;
var portReady = false;

function sendMessage(message) {
    console.log('Sending message "%s"...', message);
    port.write(message.concat("\n"));
}

var dataReceivedCallback = undefined;
var buffer = '';

module.exports = {
    listPorts: function () {

        SerialPort.list().then(
            function (ports) {
                console.log("Available ports:");
                ports.forEach(function (e) {
                    console.log('%s (%s) - %s',
                        e.path, e.manufacturer, e.productId);
                });
            },
            err => console.error(err)
        );
    },
    setup: function (message, dataReceived) {
        if (portReady) return;
        dataReceivedCallback = dataReceived;
        var messageArgs = message.split("|");
        var comPort = messageArgs[1];
        var pollRate = messageArgs[2];
        port = new SerialPort(comPort, {
            baudRate: 115200
        });
        port.on('open', function () {
            sendMessage('R|'.concat(pollRate));
            portReady = true;
        });
        port.on('data', function (chunk) {
            buffer += chunk;
            var blocks = buffer.split(/\r?\n/); // Split data by new line character or smth-else
            buffer = blocks.pop(); // Store unfinished data

            if (blocks.length > 0) {
                var dataBlock = blocks[0];
                dataReceivedCallback(dataBlock);
            }

        });
    },
    isReady: function () { return portReady; },
    handleMessage: function (message) {
        if (portReady) {
            sendMessage(message);
        }
        else {
            console.log("COM PORT NOT READY - Send setup command first!");
        }
    }
}