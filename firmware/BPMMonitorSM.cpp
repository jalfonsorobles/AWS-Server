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
}

//-------------------------------------------------------------------

void BPMMonitorSM::execute() {
    String data = "";
    long irValue = 0;
    float avgBPM = 0.0;
    float avgSPO2 = 0;
    float bpmMeasurement = 0.0;
   
    switch (state) {
       
        case BPMMonitorSM::S_Init:
            tick = 0;
            
            state = BPMMonitorSM::S_ReadBPMSensor;
            break;
            
        case BPMMonitorSM::S_ReadBPMSensor:
            irValue = heartSensor.getIR();
         
            // IR value of less than 5000 signifies the absence of finger, from source code
            if (irValue < 50000) {
                tick++;
                
                if (tick == 50) {
                    tick = 0;
                    Serial.println("No finger deteced.");
                }
            }
         
            // IR value greter than 5000 sugest we should check for a beat
            else if (checkForBeat(irValue) == true)  {
                long delta = millis() - lastBeat;
                lastBeat = millis();
                bpmMeasurement = 60 / (delta / 1000.0);
            
                // Print samples and calculation result to terminal program through UART
                if (bpmMeasurement > 20 && bpmMeasurement < 255) {
                    beatsPerMinute = bpmMeasurement;
                    Serial.print("Heart beat detected: ");
                    Serial.print(beatsPerMinute);
                    Serial.print(" BPM, sample #");
                    Serial.print(rateSpot + 1);
                    Serial.println();
                
                    // Collect 4 samples. Changed from vector to array for simplicity
                    if (rateSpot < SAMPLE_SIZE) {
                        bpmHistory[rateSpot] = beatsPerMinute;
                        rateSpot++;
                        rateSpot %= SAMPLE_SIZE;
                        state = BPMMonitorSM::S_ReadBPMSensor;
                    }
                }
            }
         
            // Samples for BPM taken, switching case to SPO2
            if (rateSpot == 0 && !sampleReported && bpmHistory[0] != 0) {
                state = BPMMonitorSM::S_ReadSPO2Sensor;
            }
            
            // Continue taking samples
            else {
                state = BPMMonitorSM::S_ReadBPMSensor;
            }
        break;
         
        case BPMMonitorSM::S_ReadSPO2Sensor:
            int32_t bufferLength; //data length
            int8_t validSPO2; //indicator to show if the SPO2 calculation is valid
            int32_t heartRate; //heart rate value
            int8_t validHeartRate; //indicator to show if the heart rate calculation is valid
        
            Serial.println(F("Attach sensor to finger with rubber band. Steadily press finger on sensor."));
            
            bufferLength = 100; //buffer length of 100 stores 4 seconds of samples running at 25sps

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
            state = BPMMonitorSM::S_Report;
        break;    
        
        case BPMMonitorSM::S_Report:
         
            // Add samples together to get average and clear results for future sampling
            for(int i = 0; i < SAMPLE_SIZE; i++) {
                avgBPM += bpmHistory[i];
                avgSPO2 += spo2History[i];
                bpmHistory[i] = 0; 
                spo2History[i] = 0;
            }
         
            avgBPM = avgBPM / SAMPLE_SIZE;
            avgSPO2 = avgSPO2 / SAMPLE_SIZE;
            data = String::format("{ \"avgBPM\": \"%f\", \"avgSPO2\": \"%f\"}", avgBPM, avgSPO2);          
            Serial.println(data);
            // Publish to webhook
            Particle.publish("readings", data, PRIVATE);
            sampleReported = true;
            alertLED();
            state = BPMMonitorSM::S_Init;
        break;
   }
}

void BPMMonitorSM::changeSampleReported() {
    sampleReported = false;
}

bool BPMMonitorSM::getReportedStatus() {
    return sampleReported;
}

void BPMMonitorSM::alertLED() {
    
    if(getReportedStatus() == false) {
        digitalWrite(D7, HIGH);
        delay(1000);
        digitalWrite(D7, LOW);
        delay(1000);   
        digitalWrite(D7, HIGH);
        return;
    }
    
    if(getReportedStatus() == true) {
        digitalWrite(D7, LOW);
        return;
    }
}













