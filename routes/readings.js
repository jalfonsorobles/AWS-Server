const express = require('express');
let router = express.Router();

let Device = require('../models/device');
let User = require('../models/user');
let Reading = require('../models/reading');

// Register a sensor reading
router.post('/data', function(req, res) {

  let responseJson = {
    posted: false,
    message : ""
  };

  // Returns one Device object if deviceId is found in database
  Device.findOne({deviceId: req.body.deviceId}, function(err, device) {

    // Case where it cannot connect to database
    if (err) {
      responseJson.message = "Cannot connect to database.";
      return res.status(400).json(responseJson);
    }

    // Case where deviceId is invalid or not registered yet
    else if (!device) {
      responseJson.message = "Device ID: " + req.body.deviceId + " is not valid or not registered.";
      return res.status(401).json(responseJson);
    }

    // Case where API key do not match
    if (req.body.apiKey != device.apiKey) {
      responseJson.message = "Access Denied: Device API key is not valid.";
      return res.status(401).json(responseJson);
    }

    // Case where API key is verified and data can be saved in database
    else {




      // Create a new reading with passed data
      let newReading = new Reading({
        userEmail: device.userEmail,
        date: ((req.body.date * 1000)),
        averageHeartRate: req.body.avgBPM,
        averageSPO2: req.body.avgSPO2,
        deviceId: req.body.deviceId,
        userEmail: device.userEmail,
        apiKey: device.apiKey
      });

      // Save reading. If successful, return success. If not, return error message.
      newReading.save(function(error, newReading) {

        if (error) {
          responseJson.message = error;
          return res.status(400).json(responseJson);
        }

        // Add readings to user in database and change reminderFlag to false
        else {
          User.findOneAndUpdate(
            { email: device.userEmail },
            { $push: { averageHeartRate: req.body.avgBPM, averageSPO2: req.body.avgSPO2 }, alertFlag: false },
            function (err, user) {

            if (err) {
              responseJson.message = err;
              return res.status(400).json(responseJson);
            }

            else {
              responseJson.posted = true;
              responseJson.message = "Data was saved successfully.";
              return res.status(201).json(responseJson);
            }
          });
        }
      });
    }
  });
});

// Register an alert to take reading
router.post('/alert', function(req, res) {

  let responseJson = {
    alerted: false,
    message : ""
  };

  // Returns one Device object if deviceId is found in database
  Device.findOne({deviceId: req.body.deviceId}, function(err, device) {

    // Case where it cannot connect to database
    if (err) {
      responseJson.message = "Cannot connect to database.";
      return res.status(400).json(responseJson);
    }

    // Case where deviceId is invalid or not registered yet
    else if (!device) {
      responseJson.message = "Device ID: " + req.body.deviceId + " is not valid or not registered.";
      return res.status(401).json(responseJson);
    }

    // Case where API key do not match
    if (req.body.apiKey != device.apiKey) {
      responseJson.message = "Access Denied: Device API key is not valid.";
      return res.status(401).json(responseJson);
    }

    // Case where API key is verified and data can be saved in database
    else {

      // Time to alert the front end that a reading should be taken
      if(req.body.alertTime == "true") {

        // Change the reminderFlag to true
        User.findOneAndUpdate(
          { email: device.userEmail },
          { alertFlag: true }, function (error, success) {

          if (error) {
            console.log(error);
            return res.status(400).json({ success: false, message: "Error contacting database" });
          }

          else {
            return res.status(201).json({ success: true, message: "reminderFlag changed successfully" });
          }
        });
      }

      else {
        // Change the reminderFlag to true
        User.findOneAndUpdate(
          { email: device.userEmail },
          { alertFlag: false }, function (error, success) {

          if (error) {
            console.log(error);
            return res.status(400).json({ success: false, message: "Error contacting database" });
          }

          else {
            return res.status(201).json({ success: true, message: "reminderFlag changed successfully" });
          }
        });
      }
    }
  });
});


module.exports = router;
