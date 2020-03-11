#include <Bounce2.h>

const size_t MAX_PORTS = 16;

unsigned long _pollInterval;
unsigned long _lastPollTime;
bool _started = false;

struct PortInfo {
  String name;
  int pin;
  bool digital;
  int value;
  Bounce* debouncer;
};

PortInfo _inputs[MAX_PORTS];
size_t _inputCount;

PortInfo _outputs[MAX_PORTS];
size_t _outputCount = 0;

void setup() {
  Serial.begin(115200);
}

void loop() {
  if (Serial.available() > 0) {
    String s = Serial.readStringUntil('\n');
    processSerial(s);
  }

  if (_started) {
    auto currentTime = millis();
    auto deltaTime = currentTime - _lastPollTime;
    if (deltaTime > _pollInterval)
    {
      if (_inputCount > 0) {

        //String payload = "";
        for (auto i = 0; i < _inputCount; i++) {

          if (_inputs[i].digital) {
            // Update the Bounce instance :
            _inputs[i].debouncer->update();
          }
          
          auto currentValue = _inputs[i].digital ?
                              _inputs[i].debouncer->read() :
                              analogRead(_inputs[i].pin);

          if (_inputs[i].value != currentValue) {
            Serial.print(_inputs[i].name + "|" + String(currentValue) + "\n");
            _inputs[i].value = currentValue;
          }
        }
      }

      _lastPollTime = currentTime;
    }
  }
}

int getPinNumber(String str) {
  if (str[0] == 'A') {
    auto analogPort = str[1] - '0';
    return analogPort + 14;
  }
  return str.toInt();
}

void setPollRate(String message) {
  auto pollRate =  getPart(message, 1).toInt();
  _pollInterval = 1000 / pollRate;
}

void processMode(String message) {
  auto strPin = getPart(message, 1);
  auto pinNumber = getPinNumber(strPin);
  auto mode = getPart(message, 2);
  auto type = getPart(message, 3);

  auto actualMode = OUTPUT;
  if (mode == "I") {
    actualMode = INPUT;
  }
  else if (mode == "U") {
    actualMode = INPUT_PULLUP;
  }
  else if (mode == "O") {
    actualMode = OUTPUT;
  }
  pinMode(pinNumber, actualMode);

  auto isDigital = type == "D";

  if (actualMode == OUTPUT) {
    _outputs[_outputCount].name = strPin;
    _outputs[_outputCount].pin = pinNumber;
    _outputs[_outputCount].digital = isDigital;

    _outputCount++;
  }
  else {
    _inputs[_inputCount].name = strPin;
    _inputs[_inputCount].pin = pinNumber;
    _inputs[_inputCount].digital = isDigital;
    _inputs[_inputCount].value = actualMode == INPUT_PULLUP ? HIGH : LOW;

    auto db = new Bounce();

    db->attach(pinNumber);
    db->interval(5); // interval in ms

    _inputs[_inputCount].debouncer = db;
    _inputCount++;
  }
}

void startPolling()
{
  _started = true;
}

void writeToPin(String message) {
  auto pinNumber = getPinNumber(getPart(message, 1));
  for (auto i = 0; i < _outputCount; i++) {
    if (_outputs[i].pin == pinNumber) {
      auto strValue = getPart(message, 2);
      if (_outputs[i].digital) {
        auto value = strValue == "L" ? LOW : HIGH;
        digitalWrite(pinNumber, value);
      }
      else {
        auto value = strValue.toInt();
        analogWrite(pinNumber, value);
      }
    }
  }

}

void processSerial(String message) {
  auto messageType = getPart(message, 0);

  if (messageType == "R") {
    setPollRate(message);
  }
  else if (messageType == "M") {
    processMode(message);
  }
  else if (messageType == "S") {
    startPolling();
  }
  else if (messageType == "W") {
    writeToPin(message);
  }
}

String getPart(String message, int index) {
  return getValue(message, '|', index);
}

String getValue(String data, char separator, int index)
{
  int found = 0;
  int strIndex[] = { 0, -1 };
  int maxIndex = data.length() - 1;

  for (int i = 0; i <= maxIndex && found <= index; i++) {
    if (data.charAt(i) == separator || i == maxIndex) {
      found++;
      strIndex[0] = strIndex[1] + 1;
      strIndex[1] = (i == maxIndex) ? i + 1 : i;
    }
  }
  return found > index ? data.substring(strIndex[0], strIndex[1]) : "";
}
