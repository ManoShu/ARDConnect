const SerialPort = require('serialport');

var readline = require('readline');

var port = undefined;
var portReady = false;

function sendMessage(message) {
    console.log('Sending message "%s"...', message);
    port.write(message.concat("\n"));
}

var dataReceivedCallback = undefined;
var buffer = '';
var comPort = '';


module.exports = {
    selectPort: function (portSelected) {

        SerialPort.list().then(
            portList => {
                console.log("Available ports:");
                var portIndex = 0;
                portList.forEach(function (e) {
                    portIndex++;
                    console.log('[%i] %s (%s) - %s',
                        portIndex, e.path, e.manufacturer, e.productId);
                });

                var rl = readline.createInterface(process.stdin, process.stdout);

                rl.setPrompt('Select a COM port> ');
                rl.prompt();
                rl.on('line', function (line) {

                    var selectedIndex = parseInt(line);
                    if (isNaN(selectedIndex) || selectedIndex < 1 || selectedIndex > portList.length) {
                        console.log("Invalid index!");
                        rl.prompt();
                    }
                    else {
                        var thePort = portList[selectedIndex - 1].path;

                        rl.close();
                        portSelected(thePort);
                    }
                });
            });
    },

    setPort: function(thePort){
        comPort = thePort;
    },
    setup: function (message, dataReceived) {
        if (portReady) return;
        dataReceivedCallback = dataReceived;
        //var messageArgs = message.split("|");
        //var pollRate = messageArgs[1];
        port = new SerialPort(comPort, {
            baudRate: 115200
        });
        port.on('open', function () {
            //sendMessage('R|'.concat(pollRate));
            sendMessage(message);
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