const ArduinoFirmata = require('arduino-firmata');

const internal = {};

function getMode(strMode) {

    var actualMode = undefined;

    //input pullup is not yet supported on firmata, Y
    switch (strMode) {
        case "P": actualMode = ArduinoFirmata.PWM; break;
        case "A": actualMode = ArduinoFirmata.ANALOG; break;
        case "S": actualMode = ArduinoFirmata.SERVO; break;
        case "I": actualMode = ArduinoFirmata.INPUT; break;
        case "O": actualMode = ArduinoFirmata.OUTPUT; break;
        default:
            console.log("Mode '%s' not expected!", strMode);
            break;
    }

    return actualMode;
}

module.exports = internal.PortInfo = class {

    constructor(pinNumber, strMode) {
        this.pinNumber = pinNumber;
        this.mode = getMode(strMode);
    }
    isOutput() {
        return (this.mode == ArduinoFirmata.OUTPUT) ||
            (this.mode == ArduinoFirmata.PWM) ||
            (this.mode == ArduinoFirmata.SERVO);
    }
    isInput() {
        return (this.mode == ArduinoFirmata.INPUT) ||
            (this.mode == ArduinoFirmata.ANALOG);
    }
}