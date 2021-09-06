//-------------------------------------------------------------------

#include "BPMMonitorSM.h"
#include "MAX30105.h"
#include "heartRate.h"
#include "spo2_algorithm.h"
#include <Wire.h>
#include <vector>

//-------------------------------------------------------------------

using namespace std;
#define MAX_BRIGHTNESS 255

//-------------------------------------------------------------------

// Status for flashing LED yellow when device is not-connected to WiFi
LEDStatus blinkYellow(RGB_COLOR_YELLOW, LED_PATTERN_BLINK, LED_SPEED_NORMAL, LED_PRIORITY_IMPORTANT);

// Status for flashing LED green once the server confirms the data was recorded in the DB
LEDStatus blinkGreen(RGB_COLOR_GREEN, LED_PATTERN_BLINK, LED_SPEED_NORMAL, LED_PRIORITY_IMPORTANT);

// Status for flashing LED blue when device needs to take a measurement
LEDStatus blinkBlue(RGB_COLOR_BLUE, LED_PATTERN_BLINK, LED_SPEED_NORMAL, LED_PRIORITY_IMPORTANT);

//-------------------------------------------------------------------

#if defined(__AVR_ATmega328P__) || defined(__AVR_ATmega168__)
    //Arduino Uno doesn't have enough SRAM to store 100 samples of IR led data and red led data in 32-bit format
    //To solve this problem, 16-bit MSB of the sampled data will be truncated. Samples become 16-bit data.
    uint16_t irBuffer[100]; //infrared LED sensor data
    uint16_t redBuffer[100];  //red LED sensor data
#else
    uint32_t irBuffer[100]; //infrared LED sensor data
    uint32_t redBuffer[100];  //red LED sensor data
#endif

//-------------------------------------------------------------------

BPMMonitorSM::BPMMonitorSM(MAX30105 &mySensor) : heartSensor(mySensor) {
    state = BPMMonitorSM::S_Init;
    beatsPerMinute = 0.0;
    SPO2 = 0;
    lastBeat = 0;
    rateSpot = 0;
    sampleReported = false;
    alertTimer = false;
    vector<float> bpmReports;
    vector<float> SPO2Reports;
    vector<int> dateCollected;
}

//-------------------------------------------------------------------

void BPMMonitorSM::execute() {
    String data = "";
    long irValue = 0;
    float avgBPM = 0.0;
    float avgSPO2 = 0.0;
    float bpmMeasurement = 0.0;
   
    switch(state) {
       
        case BPMMonitorSM::S_Init:
            tick = 0;
            avgBPM = 0.0;
            avgSPO2 = 0.0;
            
            if(!WiFi.ready()) {
                connectCloud();
            }
            
            else if(bpmReports.size() > 0) {
                state = BPMMonitorSM::S_Save;
            }
            
            state = BPMMonitorSM::S_ReadBPMSensor;
            
        break;
            
        case BPMMonitorSM::S_ReadBPMSensor:
        
            irValue = heartSensor.getIR();
         
            // IR value of less than 5000 signifies the absence of finger, from source code
            if(irValue < 50000) {
                tick++;
                
                if(tick == 50) {
                    tick = 0;
                    Serial.println("No finger deteced.");
                }
            }
         
            // IR value greter than 5000 sugest we should check for a beat
            else if(checkForBeat(irValue) == true)  {
                long delta = millis() - lastBeat;
                lastBeat = millis();
                bpmMeasurement = 60 / (delta / 1000.0);
            
                // Print samples and calculation result to terminal program through UART
                if(bpmMeasurement > 20 && bpmMeasurement < 255) {
                    beatsPerMinute = bpmMeasurement;
                    Serial.print("Heart beat detected: ");
                    Serial.print(beatsPerMinute);
                    Serial.print(" BPM, sample #");
                    Serial.print(rateSpot + 1);
                    Serial.println();
                
                    // Collect SAMPLE_SIZE samples. Changed from vector to array for simplicity
                    if(rateSpot < SAMPLE_SIZE) {
                        bpmHistory[rateSpot] = beatsPerMinute;
                        rateSpot++;
                        rateSpot %= SAMPLE_SIZE;
                        state = BPMMonitorSM::S_ReadBPMSensor;
                    }
                }
            }
         
            // Samples for BPM taken, switching case to SPO2
            if (rateSpot == 0 && bpmHistory[0] != 0) {
                state = BPMMonitorSM::S_ReadSPO2Sensor;
            }
            
            // Continue taking samples
            else {
                state = BPMMonitorSM::S_ReadBPMSensor;
            }
        
        break;
         
        case BPMMonitorSM::S_ReadSPO2Sensor:
            int32_t bufferLength;   //data length
            int8_t validSPO2;       //indicator to show if the SPO2 calculation is valid
            int32_t heartRate;      //heart rate value
            int8_t validHeartRate;  //indicator to show if the heart rate calculation is valid
        
            Serial.println(F("Attach sensor to finger with rubber band. Steadily press finger on sensor."));
            bufferLength = 100;     //buffer length of 100 stores 4 seconds of samples running at 25sps

            // Read the first 100 samples, and determine the signal range
            for (byte i = 0 ; i < bufferLength ; i++) {
                
                // Do we have new data?
                while (heartSensor.available() == false) {
                    heartSensor.check(); //Check the sensor for new data   
                }
                
                redBuffer[i] = heartSensor.getRed();
                irBuffer[i] = heartSensor.getIR();
                heartSensor.nextSample(); //We're finished with this sample so move to next sample
            }
                
            // Calculate heart rate and SpO2 after first 100 samples (first 4 seconds of samples)
            maxim_heart_rate_and_oxygen_saturation(irBuffer, bufferLength, redBuffer, &SPO2, &validSPO2, &heartRate, &validHeartRate);
                
            for (byte i = 25; i < 100; i++) {
                redBuffer[i - 25] = redBuffer[i];
                irBuffer[i - 25] = irBuffer[i];
            }
            
            // Take 25 sets of samples before calculating the heart rate.
            for (byte i = 100 - SAMPLE_SIZE; i < 100; i++) {
                
                while (heartSensor.available() == false) { //do we have new data?
                    heartSensor.check(); //Check the sensor for new data  
                } 
                
                redBuffer[i] = heartSensor.getRed();
                irBuffer[i] = heartSensor.getIR();
                heartSensor.nextSample(); //We're finished with this sample so move to next sample
                
                // Print samples and calculation result to terminal program through UART
                Serial.print(F("SPO2="));
                Serial.print(SPO2);
                Serial.print(F(", SPO2Valid="));
                Serial.print(validSPO2);
                Serial.print(", sample #");
                Serial.print(rateSpot + 1);
                Serial.println();
                
                spo2History[rateSpot] = SPO2;
                rateSpot++;
                rateSpot %= SAMPLE_SIZE;
            }
            
            // After gathering 25 new samples recalculate HR and SP02
            // maxim_heart_rate_and_oxygen_saturation(irBuffer, bufferLength, redBuffer, &SPO2, &validSPO2, &heartRate, &validHeartRate);
        
            if(spo2History[0] < 60) {
                Serial.println(F("Bad SPO2 sample, retaking a new sample."));
                state = BPMMonitorSM::S_ReadSPO2Sensor;   
            }
            
            else {
                state = BPMMonitorSM::S_Save;
            }
            
        break;    
        
        case BPMMonitorSM::S_Save:
        
            // Add samples together to get average and clear results for future sampling
            for(int i = 0; i < SAMPLE_SIZE; i++) {
                avgBPM += bpmHistory[i];
                avgSPO2 += spo2History[i];
                spo2History[i] = 0;
                bpmHistory[i] = 0; 
            }
         
            avgSPO2 = avgSPO2 / SAMPLE_SIZE;
            avgBPM = avgBPM / SAMPLE_SIZE;
            
            bpmReports.push_back(avgBPM);
            SPO2Reports.push_back(avgSPO2);
            dateCollected.push_back(Time.now());     
            
            if(WiFi.ready()) {
                state = BPMMonitorSM::S_Report;
            }
            
            else {
                // Flash yellow LED momentarily to confirm data was temporarily saved until connection is stablished
                blinkYellow.setActive(true);
                delay(5000);
                blinkYellow.setActive(false);
                
                Serial.println("Samples have been temporarily saved, until device has stable connection to upload.");
                Serial.println("New test starting:\n");
                state = BPMMonitorSM::S_Init;
            }
            
        break;
        
        case BPMMonitorSM::S_Report:
    
            Serial.println("Size of queue to upload is: " + String(bpmReports.size()));
            
            for (int i = 0; i < bpmReports.size(); i++) {
                data = String::format("{ \"avgBPM\": \"%f\", \"avgSPO2\": \"%f\", \"date\": \"%d\" }", bpmReports.at(i), SPO2Reports.at(i), dateCollected.at(i));
                
                // Publish to webhook
                Particle.publish("readings", data, PRIVATE);
                Serial.println("Data published successfully: " + data);
                sampleReported = true;
                
                // Turn off blue LED in case it was on
                blinkBlue.setActive(false);
                
                // Flash green LED momentarily to confirm data was saved successfully
                blinkGreen.setActive(true);
                delay(5000);
                blinkGreen.setActive(false);
            }
            
            // Return to initial state and clear vectors
            bpmReports.clear();
            SPO2Reports.clear();
            dateCollected.clear();
            Serial.println("New test starting:");
            state = BPMMonitorSM::S_Init;
        
        break;
   }
}

void BPMMonitorSM::changeSampleReported(bool boolean) {
    sampleReported = boolean;
}

void BPMMonitorSM::changeAlertTimer(bool boolean) {
    alertTimer = boolean;
}

bool BPMMonitorSM::getReportedStatus() {
    return sampleReported;
}

bool BPMMonitorSM::getAlertTimerStatus() {
    return alertTimer;
}

void BPMMonitorSM::connectCloud() {
    Particle.connect();
    delay(2000);
    Serial.println("Checking for connection first:");
    
    // Try to connect for 20 seconds
    for (int i = 0; i < 4; i++){
        
        if (WiFi.ready()){
        Serial.println("Connected to the cloud via network: " + String(WiFi.SSID()));
        Serial.println("");
        return;
        }
    
        else {
            delay(5000);
            Serial.println("...");
        }
        
        if(i == 3) {
            Serial.println("No connection established, trying again after next reading.");
            return;
        }
    }
}