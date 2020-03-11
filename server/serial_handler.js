const SerialPort = require('serialport');

var readline = require('readline');

var port = undefined;

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
    setup: function (comPort, dataReceived) {
        this.comPort = comPort;
        dataReceivedCallback = dataReceived;

        port = new SerialPort(comPort, {
            baudRate: 115200
        });
        port.on('open', function () {
            
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
        port.on('error', function (err) {
            console.log('Error: ', err.message)
            process.exit(1);
        });
    },
    handleMessage: function (message) {
        if (port.isOpen) {
            sendMessage(message);
        }
        else {
            console.log("WARN: message '%s' received but port is not opened.", message);
        }
    }
}