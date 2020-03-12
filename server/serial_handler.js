const SerialPort = require('serialport');
const ArduinoFirmata = require('arduino-firmata');
const readline = require('readline');
const PortInfo = require('./port_info');

const arduino = new ArduinoFirmata();

const ANALOG_OFFSET = 14;

var portList = [];
var inputPorts = [];

var preModeValues = {};

function processMode(messageParts) {
    var pinName = messageParts[1];
    var hasEntryOnList = false;
    portList.forEach(item => hasEntryOnList |= item.name == pinName);
    if (!hasEntryOnList) {
        var pinEntry = new PortInfo(pinName, getPinNumber(pinName));
        var strMode = messageParts[2];
        var strType = messageParts[3];
        pinEntry.setModeAndType(strMode, strType);

        if (pinEntry.mode == ArduinoFirmata.INPUT) {
            inputPorts.push(pinEntry.pinNumber);
        }

        //console.log("Adding pin '%s' (%i)...", pinEntry.name, pinEntry.pinNumber);

        portList.push(pinEntry);

        arduino.pinMode(pinEntry.pinNumber, pinEntry.mode);

        if (pinEntry.mode != ArduinoFirmata.OUTPUT) {

            var key = pinEntry.pinNumber;

            if (key in preModeValues) {
                emitPortUpdate(key, preModeValues[key]);
                delete preModeValues[key];
            }
            else {
                var theValue =
                    pinEntry.digital ?
                        (arduino.digitalRead(key) == ArduinoFirmata.LOW ? "L" : "H") :
                        arduino.analogRead(key);

                emitPortUpdate(key, theValue);
            }
        }
    }
}

function writeToPin(messageParts) {
    var pinName = messageParts[1];
    var entryIndex = -1;

    var hasEntryOnList = false;
    portList.forEach(item => {

        if (!hasEntryOnList) {
            entryIndex++;
            if (item.name == pinName) {
                hasEntryOnList = true;
            }
        }
    });
    if (hasEntryOnList) {
        var pinEntry = portList[entryIndex];
        if (pinEntry.mode == ArduinoFirmata.OUTPUT) {
            var strValue = messageParts[2];
            if (pinEntry.digital) {
                arduino.digitalWrite(pinEntry.pinNumber, strValue == "L" ?
                    ArduinoFirmata.LOW : ArduinoFirmata.HIGH
                );
            }
            else {
                arduino.analogWrite(pinEntry.pinNumber, Number(strValue));
            }
        }
        else {
            console.log("Pin '%s' not set as output!", pinName);
        }
    }
    else {
        console.log("Pin '%s' not set previously!", pinName);
    }
}

function sendMessage(message) {
    //console.log('Sending command "%s"...', message);
    const messageParts = message.split("|");

    //message type
    switch (messageParts[0]) {
        case "M":
            processMode(messageParts);
            break;
        case "W":
            writeToPin(messageParts);
            break;
        default:
            console.log("Command '%s' not expected", message);
            break;
    }
}

var dataReceivedCallback = undefined;

function emitPortUpdate(port, value) {

    var entryIndex = -1;

    var hasEntryOnList = false;
    portList.forEach(item => {
        if (!hasEntryOnList) {
            entryIndex++;
            if (item.pinNumber == port) {
                hasEntryOnList = true;
            }
        }
    });

    if (hasEntryOnList) {
        var pinEntry = portList[entryIndex];
        var message = pinEntry.name + "|" + value;
        dataReceivedCallback(message);
    }
}

function getPinNumber(strPinName) {
    if (strPinName[0] == "A") {
        var analogPort = Number(strPinName[1]);
        return analogPort + ANALOG_OFFSET;
    }
    return Number(strPinName);
}


function isPinDigital(pinNumber) {
    var entryIndex = -1;
    var hasEntryOnList = false;
    portList.forEach(item => {
        if (!hasEntryOnList) {
            entryIndex++;
            if (item.pinNumber == pinNumber) {
                hasEntryOnList = true;
            }
        }
    });

    if (hasEntryOnList) {
        var pinEntry = portList[entryIndex];

        return pinEntry.digital;
    }

    return undefined;
}


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
    setup: function (comPort, dataReceived, boardConnected) {
        //this.comPort = comPort;
        dataReceivedCallback = dataReceived;

        arduino.connect(comPort);

        arduino.on('connect', function () {

            boardConnected();
        });

        arduino.on('digitalChange', function (e) {
            var pinType = isPinDigital(e.pin);
            var strValue = e.value == ArduinoFirmata.HIGH ? "H" : "L";
                if (pinType == true) {
                emitPortUpdate(e.pin, strValue);
            }
            else if (pinType == undefined) {
                preModeValues[pinNumber] = strValue;
            }
        });

        arduino.on('analogChange', function (e) {

            //console.log("analog %i %i", e.pin, e.value);
            var pinNumber = e.pin + ANALOG_OFFSET;

            var pinType = isPinDigital(pinNumber);
            if (pinType == false) {
                emitPortUpdate(pinNumber, e.value);
            }
            else if (pinType == undefined) {
                preModeValues[pinNumber] = e.value;
            }
        });
    },
    handleMessage: function (message) {
        if (arduino.isOpen) {
            sendMessage(message);
        }
        else {
            console.log("WARN: message '%s' received but port is not opened.", message);
        }
    }
}