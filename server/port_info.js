const ArduinoFirmata = require('arduino-firmata');

const internal = {};


module.exports = internal.PortInfo = class {

    constructor(name, pinNumber, active) {
        this.name = name;
        this.pinNumber = pinNumber;
        this.active = active;
    }

    setModeAndType(strMode, strType) {
        var actualMode = ArduinoFirmata.OUTPUT;
        //input pullup is not yet supported on firmata, Y
        if (strMode == "I") {
            actualMode = ArduinoFirmata.INPUT;
        }
        else if (strMode == "A") {
            actualMode = ArduinoFirmata.ANALOG;
        }

        this.mode = actualMode;
        this.digital = (strType == "D");
    }


}