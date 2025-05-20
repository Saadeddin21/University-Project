#include <Wire.h>

// Pins
const int moistureSensorPin = A0; // Soil moisture sensor
const int waterLevelPin = A1;     // Water level sensor (not used for now)
const int pumpPin = 8;            // Pump control pin

// Ultrasonic sensor pins
const int trigPin = 9;            // Trigger pin for ultrasonic sensor
const int echoPin = 10;           // Echo pin for ultrasonic sensor

// Variables
bool isPumpOn = false;
bool isTroubleshootMode = false;

unsigned long pumpStartTime = 0;  // Tracks when the pump was turned on
bool isCooldownActive = false;    // Tracks if the pump is in cooldown
unsigned long cooldownStartTime = 0; // Tracks when the cooldown started

int soilMoistureThreshold = 30; // Default threshold

void setup() {
  Serial.begin(9600);
  
  // Initialize pins
  pinMode(pumpPin, OUTPUT);
  digitalWrite(pumpPin, LOW);

  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
}

void loop() {
  // Read soil moisture sensor
  int rawMoisture = analogRead(moistureSensorPin);
  int moisturePercent = map(rawMoisture, 0, 1023, 100, 0); // Invert for soil moisture

  // Read ultrasonic sensor for water level
  long duration;
  float distance;
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  duration = pulseIn(echoPin, HIGH);
  distance = duration * 0.034 / 2; // Convert to cm

  // Simulate percentage values for water level (adjust min/max distances as needed)
  const float maxDistance = 30.0; // Maximum water tank height in cm
  const float minDistance = 5.0;  // Minimum water tank height in cm
  int waterPercent = constrain(map(distance, maxDistance, minDistance, 0, 100), 0, 100);

  // Check for low water level
  bool lowWater = waterPercent < 20;

  // Automatic pump control (only in AUTO mode)
  if (!isTroubleshootMode) {
    if (lowWater) {
      // Turn off the pump if water level is too low
      digitalWrite(pumpPin, LOW);
      isPumpOn = false;
    } else if (isPumpOn) {
      // Check if the pump has been running for 6 seconds
      if (millis() - pumpStartTime >= 6000) {
        digitalWrite(pumpPin, LOW);
        isPumpOn = false;
        isCooldownActive = true;
        cooldownStartTime = millis(); // Start cooldown timer
      }
    } else if (isCooldownActive) {
      // Check if the cooldown period is over
      if (millis() - cooldownStartTime >= 6000) {
        isCooldownActive = false;
        // Check soil moisture after cooldown
        if (moisturePercent < soilMoistureThreshold) {
          digitalWrite(pumpPin, HIGH);
          isPumpOn = true;
          pumpStartTime = millis(); // Start pump timer
        }
      }
    } else {
      // Check soil moisture to decide if the pump should turn on
      if (moisturePercent < soilMoistureThreshold) {
        digitalWrite(pumpPin, HIGH);
        isPumpOn = true;
        pumpStartTime = millis(); // Start pump timer
      }
    }
  }

  // Send data to server
  Serial.print("MOISTURE:");
  Serial.print(moisturePercent);
  Serial.print(",WATER:");
  Serial.print(waterPercent);
  Serial.print(",PUMP:");
  Serial.print(isPumpOn ? "1" : "0");
  Serial.print(",RAWMOISTURE:");
  Serial.print(rawMoisture);
  Serial.print(",RAWWATER:");
  Serial.print(distance); // Raw water level in cm
  Serial.print(",TROUBLESHOOTMODE:");
  Serial.print(isTroubleshootMode ? "1" : "0"); // Include Troubleshoot Mode status
  Serial.print(",WARNING:");
  if (lowWater) {
    Serial.print("lowWater");
  } else if (isCooldownActive) {
    Serial.print("cooldown");
  } else {
    Serial.print("none");
  }
  Serial.print(",SOILTHRESHOLD:");
  Serial.print(soilMoistureThreshold); // Send current soil moisture threshold
  Serial.println();

  delay(1000);

// Handle commands from server
if (Serial.available()) {
  String command = Serial.readStringUntil('\n');
  command.trim();

  if (command.startsWith("THRESHOLD:SOIL:")) {
    int newThreshold = command.substring(15).toInt(); // Extract the threshold value
    soilMoistureThreshold = constrain(newThreshold, 0, 100); // Ensure it's within valid range
    Serial.print("Updated soil moisture threshold to: ");
    Serial.println(soilMoistureThreshold);
  } else if (command == "MODE:TROUBLESHOOT") {
    isTroubleshootMode = true;
  } else if (command == "MODE:AUTO") {
    isTroubleshootMode = false;
  } else if (command == "PUMP:ON") {
    digitalWrite(pumpPin, HIGH);
    isPumpOn = true;
  } else if (command == "PUMP:OFF") {
    digitalWrite(pumpPin, LOW);
    isPumpOn = false;
  }
}
}
