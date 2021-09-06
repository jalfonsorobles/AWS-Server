//-------------------------------------------------------------------

#include <Wire.h>
#include "MAX30105.h"
#include "BPMMonitorSM.h"
#include "spo2_algorithm.h"

//-------------------------------------------------------------------

using namespace std;

//-------------------------------------------------------------------

#define ONE_DAY_MILLIS (1000 * 60 * 60 * 24)
#define FOUR_MIN_MILLIS (1000 * 60 * 4)

//-------------------------------------------------------------------

// The semi-automatic mode will not attempt to connect the device to the cloud automatically, 
// but once you connect it automatically handles reconnection.
SYSTEM_MODE(SEMI_AUTOMATIC);
SYSTEM_THREAD(ENABLED);

//-------------------------------------------------------------------


// Status for flashing LED yellow when device is not-connected to WiFi
LEDStatus blinkYellow0(RGB_COLOR_YELLOW, LED_PATTERN_BLINK, LED_SPEED_NORMAL, LED_PRIORITY_IMPORTANT);

// Status for flashing LED green once the server confirms the data was recorded in the DB
LEDStatus blinkGreen0(RGB_COLOR_GREEN, LED_PATTERN_BLINK, LED_SPEED_NORMAL, LED_PRIORITY_IMPORTANT);

// Status for flashing LED blue when device needs to take a measurement
LEDStatus blinkBlue0(RGB_COLOR_BLUE, LED_PATTERN_BLINK, LED_SPEED_NORMAL, LED_PRIORITY_IMPORTANT);

//-------------------------------------------------------------------

unsigned long lastSync = millis();
unsigned long lastReport = millis();

//-------------------------------------------------------------------

// Sensors and Outputs
byte pulseLED = 11;         // Must be on PWM pin
byte readLED = 13;          // Blinks with each data read
byte ledBrightness = 60;    // Options: 0=Off to 255=50mA
byte sampleAverage = 4;     // Options: 1, 2, 4, 8, 16, 32
byte ledMode = 2;           // Options: 1 = Red only, 2 = Red + IR, 3 = Red + IR + Green
byte sampleRate = 100;      // Options: 50, 100, 200, 400, 800, 1000, 1600, 3200
int pulseWidth = 411;       // Options: 69, 118, 215, 411
int adcRange = 4096;        // Options: 2048, 4096, 8192, 16384
int startTime = 6;          // Start time to take readings
int endTime = 22;           // End time to take readings
int timeZone = -7;          // AZ timezone
int sampleFrequency = 30;   // Frequency in minutes at which the samples will be requested
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
    
    // Connecto the cloud
    Particle.connect();
    
    // Delay to turn on serial monitor
    delay(3000);
    Serial.println("Welcome to HeartTrack's Serial Monitor");
    
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
    
    // Setting up the variables for changing later in the API
    Particle.variable("startTime", startTime);
    Particle.variable("endTime", endTime);
    Particle.variable("sampleFrequency", sampleFrequency);
    
    // Sets the timezone to AZ
    Time.zone(timeZone);
    
    // Function that can be called in the API
    Particle.function("updateHours", updateHours);
    Particle.function("updateFrequency", updateFrequency);
}

//-------------------------------------------------------------------

void loop() {
    
    // Request time synchronization from the Particle Cloud once per day
    if (millis() - lastSync > ONE_DAY_MILLIS) {
        Particle.syncTime();
        lastSync = millis();
    }
    
    // Start sensor
    if (executeStateMachines) {
         bpmSM.execute();
    }    
    
    // Start taking readings when inside time boundaries
    if(Time.hour() >= startTime && Time.hour() < endTime) {
        
        if(millis() - lastReport > 1000 * 60 * sampleFrequency) {
        Serial.println("Time to take a reading sample");
        
        // Publish to webhook the alert
        data = String::format("{ \"alertTime\": \"true\"}");     
        Particle.publish("alert", data, PRIVATE);
        
        // Set flags accordingly for timers and LED
        bpmSM.changeSampleReported(false);
        bpmSM.changeAlertTimer(true);
        blinkBlue0.setActive(true);
        lastReport = millis();
        }
    
        if(millis() - lastReport > FOUR_MIN_MILLIS && bpmSM.getAlertTimerStatus() == 1) {
        Serial.println("Sample timer restarted");
        bpmSM.changeAlertTimer(false);
        blinkBlue0.setActive(false);
        lastReport = millis();
        } 
    }
    
    else {
        Serial.println("Outside hours of operation");
        delay(60000);
    }
    
}

//-------------------------------------------------------------------

// When obtain response from the publish
void myHandlerReadings(const char *event, const char *data) {
 // Formatting output
 String output = String::format("Response from Post:\n  %s\n", data);
 // Log to serial console
 Serial.println(output);
 // Restart lastReport when data is saved
 lastReport = millis();
}

// When obtain response from the publish
void myHandlerAlert(const char *event, const char *data) {
 // Formatting output
 String output = String::format("Response from Post:\n  %s\n", data);
 // Log to serial console
 Serial.println(output);
}

// Function to update hours of operations
int updateHours(String limits) {
    startTime = (int) atoi(limits) / 100;
    endTime = (int) atoi(limits) % 100;
    
    String output = String::format("New starting hour: %d:00\nNew ending hour: %d:00", startTime, endTime);
    Serial.println(output);
    return 1;
}

// Function to update the sampling frequency
int updateFrequency(String period) {
    sampleFrequency = (int) atoi(period);
    
    String output = String::format("New sampling frequency is set to: %d minutes", sampleFrequency);
    Serial.println(output);
    return 1;
}