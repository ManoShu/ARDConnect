const size_t MAX_PORTS = 16;

unsigned long _pollInterval;
unsigned long _lastPollTime;
bool _started = false;

struct PortInfo {
  int pin;
  bool digital;
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
        String payload = "";
        for (auto i = 0; i < _inputCount; i++) {

          if (_inputs[i].digital) {
            payload = payload + (digitalRead(_inputs[i].pin) == LOW ? "L" : "H");
          }
          else {
            payload = payload + String(analogRead(_inputs[i].pin));
          }

          if (i < _inputCount - 1) {
            payload = payload + "|";
          }
        }
        payload = payload + "\n";
        Serial.print(payload);
      }

      _lastPollTime = currentTime;// + (_pollInterval - (deltaTime - _pollInterval));
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
  auto pinNumber = getPinNumber(getPart(message, 1));
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
    _outputs[_outputCount].pin = pinNumber;
    _outputs[_outputCount].digital = isDigital;
    _outputCount++;
  }
  else {
    _inputs[_inputCount].pin = pinNumber;
    _inputs[_inputCount].digital = isDigital;
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
