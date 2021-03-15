//-------------------------------------------------------------------

#ifndef BPMMonitorSM_H
#define BPMMonitorSM_H

//-------------------------------------------------------------------

#include <vector>
#include <Wire.h>
#include <time.h>
#include "MAX30105.h"

//-------------------------------------------------------------------

using namespace std;

//-------------------------------------------------------------------

#define SAMPLE_SIZE 8

//-------------------------------------------------------------------

class BPMMonitorSM {
   enum State { S_Init, S_ReadBPMSensor, S_ReadSPO2Sensor, S_Report};

private:
   State state;
   long lastBeat;
   int tick;
   float beatsPerMinute;
   int32_t SPO2;
   int rateSpot;
   MAX30105& heartSensor;
   float bpmHistory[SAMPLE_SIZE];
   int32_t spo2History[SAMPLE_SIZE];
   bool sampleReported;
    
public:
   BPMMonitorSM(MAX30105& mySensor);  
   void execute();
   void changeSampleReported();
   float getBPM();
   bool getReportedStatus();
   void alertLED();
};

//-------------------------------------------------------------------

#endif
