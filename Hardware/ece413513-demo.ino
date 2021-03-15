//-------------------------------------------------------------------

#include <Wire.h>
#include "MAX30105.h"
#include "BPMMonitorSM.h"
#include "spo2_algorithm.h"

//-------------------------------------------------------------------

using namespace std;

//-------------------------------------------------------------------

#define ONE_DAY_MILLIS (1000 * 60 * 60 * 24)
#define THIRTY_MIN_MILLIS (1000 * 60  * 1.5)
unsigned long lastSync = millis();
unsigned long lastReport = millis();

//-------------------------------------------------------------------

// Sensors and Outputs
byte pulseLED = 11; //Must be on PWM pin
byte readLED = 13; //Blinks with each data read
byte ledBrightness = 60; //Options: 0=Off to 255=50mA
byte sampleAverage = 4; //Options: 1, 2, 4, 8, 16, 32
byte ledMode = 2; //Options: 1 = Red only, 2 = Red + IR, 3 = Red + IR + Green
byte sampleRate = 100; //Options: 50, 100, 200, 400, 800, 1000, 1600, 3200
int pulseWidth = 411; //Options: 69, 118, 215, 411
int adcRange = 4096; //Options: 2048, 4096, 8192, 16384
String data = "";

//Variables and objects
MAX30105 heartSensor = MAX30105();

//-------------------------------------------------------------------

// State Machines

BPMMonitorSM bpmSM (heartSensor);

//-------------------------------------------------------------------

// State machine scheduler

bool executeStateMachines = false;

void simpleScheduler() {
   executeStateMachines = true;
}

Timer schedulerTimer(10, simpleScheduler);

//-------------------------------------------------------------------

void setup() {
  Serial.begin(115200);
  pinMode(pulseLED, OUTPUT);
  pinMode(readLED, OUTPUT);
  Serial.println("ECE 413/513 Argon and MAX30105 Test");
  
 
  // Sensor Initialization:  default I2C port, 400kHz speed
  if (!heartSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("MAX30105 was not found. Please check wiring/power.");
    while (1);
  }

  // Configure sensor with these settings    
  heartSensor.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange);

  // Turn Red LED to low to indicate sensor is running
  heartSensor.setPulseAmplitudeRed(0x0A);

  // Turn off Green LED
  heartSensor.setPulseAmplitudeGreen(0);

  // Starts the state machine scheduler timer.
  schedulerTimer.start();

  // Setup webhook subscribe
  Particle.subscribe("hook-response/readings", myHandlerReadings, MY_DEVICES);
  Particle.subscribe("hook-response/alert", myHandlerAlert, MY_DEVICES);
  
  // LED will be used as a 30 min timer alert
  pinMode(D7, OUTPUT);
}

//-------------------------------------------------------------------

void loop() {
    
    // Request time synchronization from the Particle Cloud once per day
    if(millis() - lastSync > ONE_DAY_MILLIS) {
        Particle.syncTime();
        lastSync = millis();
    }
    
    if (executeStateMachines) {
        bpmSM.execute();
    }
    
    if(millis() - lastReport > THIRTY_MIN_MILLIS) {
        Serial.println("Time to take a reading sample");
        data = String::format("{ \"alertTime\": \"true\"}");     
        Particle.publish("alert", data, PRIVATE);
        bpmSM.changeSampleReported();
        bpmSM.alertLED();
        lastReport = millis();
    }
    
    // // Flashing blue LED 
    // if(bpmSM.getReportedStatus() == false) {
         
    //     if(digitalRead(D7) == HIGH) {
    //         digitalWrite(D7, LOW);
    //         delay(100);
    //         return;
    //     }
         
    //     else {
    //         digitalWrite(D7, HIGH);
    //         delay(100);
    //         return;
    //     }
    // }
    
    // else {
    //     digitalWrite(D7, LOW);
    //     return;
    // }
}

//-------------------------------------------------------------------

// When obtain response from the publish
void myHandlerReadings(const char *event, const char *data) {
 // Formatting output
 String output = String::format("Response from Post:\n  %s\n", data);
 // Log to serial console
 Serial.println(output);
}

// When obtain response from the publish
void myHandlerAlert(const char *event, const char *data) {
 // Formatting output
 String output = String::format("Response from Post:\n  %s\n", data);
 // Log to serial console
 Serial.println(output);
}
