const express = require('express');
let router = express.Router();
let fs = require('fs');
let jwt = require("jwt-simple");
let superagent = require('superagent');
let Device = require("../models/device");
let User = require("../models/user");

let secret = fs.readFileSync(__dirname + '/../../jwtkey').toString();

// Function to generate a random apikey consisting of 32 characters
function getNewApikey() {
  let newApikey = "";
  let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < 32; i++) {
    newApikey += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }

  return newApikey;
}

// Endpoint to register a new device with device ID
router.post('/register', function(req, res, next) {
  let responseJson = {
    registered: false,
    message : "",
    apiKey : "none",
    deviceId : "none"
  };

  let deviceExists = false;

  // Ensure the request includes the deviceId parameter
  if(!req.body.hasOwnProperty("deviceId")) {
    responseJson.message = "Missing device ID.";
    return res.status(400).json(responseJson);
  }

  let email = "";

  // If authToken provided, use email in authToken
  if (req.headers["x-auth"]) {

    // AuthToken is valid
    try {
      let decodedToken = jwt.decode(req.headers["x-auth"], secret);
      email = decodedToken.email;
    }

    // AuthToken is invalid
    catch (ex) {
      responseJson.message = "Invalid authorization token.";
      return res.status(401).json(responseJson);
    }
  }

  else {
    // Ensure the request includes the email parameter
    if(!req.body.hasOwnProperty("email")) {
      responseJson.message = "Invalid authorization token or missing email address.";
      return res.status(401).json(responseJson);
    }
    email = req.body.email;
  }

  // See if device is already registered
  Device.findOne({deviceId: req.body.deviceId}, {useFindAndModify: false}, function(err, device) {
    if (device !== null) {
      responseJson.message = "Device ID " + req.body.deviceId + " already registered.";
      return res.status(400).json(responseJson);
    }

    else {
      // Create a new apikey
      deviceApikey = getNewApikey();

      // Create a new device with specified id, user email, and randomly generated apikey.
      let newDevice = new Device({
        deviceId: req.body.deviceId,
        userEmail: email,
        apiKey: deviceApikey
      });

      // Save device. If successful, return success. If not, return error message.
      newDevice.save(function(err, newDevice) {

        if (err) {
          responseJson.message = err;
          // This following is equivalent to: res.status(400).send(JSON.stringify(responseJson));
          return res.status(400).json(responseJson);
        }

        else {
          responseJson.registered = true;
          responseJson.apiKey = deviceApikey;
          responseJson.deviceId = req.body.deviceId;
          responseJson.message = "Device ID " + req.body.deviceId + " was registered.";

          // Add this device to the userDevices array in database
          User.findOneAndUpdate(
            { email: email },
            { $push: { userDevices: newDevice.deviceId  } }, function (error, success) {

            if (error) {
              return res.status(400).json(responseJson);
              console.log(error);
            }

            else {
              return res.status(201).json(responseJson);
              console.log(success);
            }
          });
        }
      });
    }
  });
});

// POST request to api.particle.io to ping device
router.post('/ping', function(req, res, next) {
  let particleAccessToken = "bbf6d7f64a77a485508eedf56e1a6573bfc962e1";

  let responseJson = {
    success: false,
    message : "",
  };

  // Ensure the request includes the deviceId parameter
  if(!req.body.hasOwnProperty("deviceId")) {
    responseJson.message = "Missing device ID.";
    return res.status(400).json(responseJson);
  }

  // Use authToken for verification
  try {
    let decodedToken = jwt.decode(req.headers["x-auth"], secret);
  }

  catch (ex) {
    responseJson.message = "Invalid authorization token.";
    return res.status(400).json(responseJson);
  }

  // request({
  //    method: "POST",
  //    uri: "https://api.particle.io/v1/devices/" + req.body.deviceId + "/ping",
  //    form: {
  //      access_token : particleAccessToken
  //     }
  // });

  // Sending request using particleAccessToken
  superagent
  .put("https://api.particle.io/v1/devices/" + req.body.deviceId + "/ping")
  .type('application/x-www-form-urlencoded')
  .send({ access_token: particleAccessToken })
  .end((err, response) => {

    if(response.body.online == true && response.body.ok == true) {
      let today = new Date();
      let time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
      responseJson.success = true;
      responseJson.message = "Device pinged successfully at " + time;
      return res.status(200).json(responseJson);
    }

    else {
      responseJson.success = false;

      if(!response.body.hasOwnProperty("error_description")) {
        responseJson.message = "Device not online";
        return res.status(200).json(responseJson);
      }

      else {
        responseJson.message = "Device not pinged. Error: " + response.body.error_description;
        return res.status(200).json(responseJson);
      }
    }
  });
});

// Signals the device for 10 seconds approximately
router.post('/signal', function(req, res, next) {

  let responseJson = {
    success: false,
    message : "",
  };

  // Ensure the request includes the deviceId parameter
  if(!req.body.hasOwnProperty("deviceId")) {
    responseJson.message = "Missing device ID.";
    return res.status(400).json(responseJson);
  }

  // Use authToken for verification
  try {
    let decodedToken = jwt.decode(req.headers["x-auth"], secret);
  }

  catch (ex) {
    responseJson.message = "Invalid authorization token.";
    return res.status(400).json(responseJson);
  }

  let particleAccessToken = "bbf6d7f64a77a485508eedf56e1a6573bfc962e1";

  // Start the signaling
  superagent
  .put("https://api.particle.io/v1/devices/" + req.body.deviceId)
  .type('application/x-www-form-urlencoded')
  .send({ signal: 1, access_token : particleAccessToken })
  .end((err, response) => {

    setTimeout(timer, 10000);

    // Stop the signaling
    function timer() {
      superagent
      .put("https://api.particle.io/v1/devices/" + req.body.deviceId)
      .type('application/x-www-form-urlencoded')
      .send({ signal: 0, access_token : particleAccessToken })
      .end((err, response) => {});
    }

    responseJson.success = true;
    responseJson.message = "Device now signaling";
    return res.status(200).json(responseJson);
  });
});

module.exports = router;
