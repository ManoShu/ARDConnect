const SerialPort = require('serialport');
const ArduinoFirmata = require('arduino-firmata');
const readline = require('readline');
const PortInfo = require('./port_info');
const clamp = require('clamp');

const arduino = new ArduinoFirmata();

const ANALOG_OFFSET = 14;

var portList = [];

var preModeValues = {};

function getPinNumber(strPinName) {
    if (strPinName[0] == "A") {
        var analogPort = Number(strPinName[1]);
        return analogPort + ANALOG_OFFSET;
    }
    return Number(strPinName);
}

function processMode(messageParts) {
    var pinNumber = getPinNumber(messageParts[1]);
    var hasEntryOnList = false;
    var pinEntry = undefined;

    portList.forEach(item => {
        hasEntryOnList |= item.pinNumber == pinNumber;
        if (item.pinNumber == pinNumber) {
            pinEntry = item;
        }
    });

    if (!hasEntryOnList) {

        var strPinMode = messageParts[2];

        var pinEntry = new PortInfo(pinNumber, strPinMode);

        portList.push(pinEntry);

        arduino.pinMode(pinEntry.pinNumber, pinEntry.mode);

        if (pinEntry.isInput()) {

            var key = pinEntry.pinNumber;

            if (key in preModeValues) {
                emitPortUpdate(key, preModeValues[key]);
            }
            else {
                var theValue =
                    pinEntry.mode == ArduinoFirmata.INPUT ?
                        (arduino.digitalRead(key) ? "H" : "L") :
                        arduino.analogRead(key);

                emitPortUpdate(key, theValue);

                preModeValues[key] = theValue;
            }
        }
    }
    else {
        if (pinEntry.isInput()) {

            var key = pinEntry.pinNumber;

            if (key in preModeValues) {
                emitPortUpdate(key, preModeValues[key]);
            }
            else {
                var theValue =
                    pinEntry.mode == ArduinoFirmata.INPUT ?
                        (arduino.digitalRead(key) ? "H" : "L") :
                        arduino.analogRead(key);

                emitPortUpdate(key, theValue);

                preModeValues[key] = theValue;
            }
        }
    }
}

function writeToPin(messageParts) {
    var pinName = messageParts[1];
    var pinNumber = getPinNumber(pinName);
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
        if (pinEntry.isOutput()) {

            var strValue = messageParts[2];
            if (pinEntry.mode == ArduinoFirmata.OUTPUT) {
                arduino.digitalWrite(pinEntry.pinNumber, strValue == "L" ?
                    ArduinoFirmata.LOW : ArduinoFirmata.HIGH
                );
            }
            else if (pinEntry.mode == ArduinoFirmata.SERVO) {
                //console.log("Servo " + strValue);
                arduino.servoWrite(pinEntry.pinNumber, clamp(Number(strValue), 0, 180));
            }
            else if (pinEntry.mode == ArduinoFirmata.PWM) {
                //console.log("pwm " + strValue);
                arduino.analogWrite(pinEntry.pinNumber, clamp(Number(strValue), 0, 255));
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

var arduinoPort = undefined;
var dataReceivedCallback = undefined;
var boardConnectedCallback = undefined;

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
        var strPort = pinEntry.mode == ArduinoFirmata.ANALOG ? ("A" + String(port - ANALOG_OFFSET)) : String(port);
        var message = strPort + "|" + value;
        dataReceivedCallback(message);
    }
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

        return pinEntry.mode == ArduinoFirmata.OUTPUT || pinEntry.mode == ArduinoFirmata.INPUT;
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
        arduinoPort = comPort;
        dataReceivedCallback = dataReceived;
        boardConnectedCallback = boardConnected;

        this.connect();
    },
    connect: function () {
        arduino.connect(arduinoPort);

        arduino.on('connect', function () {

            boardConnectedCallback();
        });

        arduino.on('digitalChange', function (e) {
            var pinType = isPinDigital(e.pin);
            var strValue = e.value ? "H" : "L";

            if (pinType == true) {
                emitPortUpdate(e.pin, strValue);
            }
            preModeValues[e.pin] = strValue;
        });

        arduino.on('analogChange', function (e) {

            //console.log("analog %i %i", e.pin, e.value);
            var pinNumber = e.pin + ANALOG_OFFSET;

            var pinType = isPinDigital(pinNumber);
            if (pinType == false) {
                emitPortUpdate(pinNumber, e.value);
            }

            preModeValues[pinNumber] = e.value;

        });
    },
    isOpen: function () {
        return arduino.isOpen()
    },
    disconnect: function () {
        arduino.close();
    },
    handleMessage: function (message) {
        if (arduino.isOpen) {
            sendMessage(message);
        }
        else {
            console.log("WARN: message '%s' received but port is not opened.", message);
        }
    }//,
    // sendCurrentStates: function () {
    //     Object.keys(preModeValues).forEach(function (key) {
    //         emitPortUpdate(key, preModeValues[key]);
    //     });
    // },
    // resetBoard: function () {
    //     arduino.reset(function () {
    //         console.log('board reset');
    //     });
    // }


}