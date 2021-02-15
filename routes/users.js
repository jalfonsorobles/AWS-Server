const express = require('express');
let router = express.Router();
let bcrypt = require('bcryptjs');
let jwt = require('jwt-simple');
let fs = require('fs');

let Device = require('../models/device');
let User = require('../models/user');
let Reading = require('../models/reading');

let secret = fs.readFileSync(__dirname + '/../../jwtkey').toString();

// Register a new user
router.post('/register', function(req, res) {

  // Hashing the password ten rounds
  bcrypt.hash(req.body.password, 10, function(err, hash) {

    // Error hashing password
    if(err) {
      console.log("error hashing password");
      res.status(400).json({success : false, message : err.errmsg});
    }

    // New User object is created from req.body parameters and hashed password
    else {

      let newUser = new User({
        email: req.body.email,
        fullName: req.body.fullName,
        passwordHash: hash
      });

      // Saving newUser to the database
      newUser.save(function(err, user) {

        // Error in connecing to database and saving newUser
        if(err) {
          console.log("error in Saving user to database");
          res.status(400).json({success: false, message: err.errmsg});
        }

        // User object was successfully added to database
        else {
          console.log("User was added successfully to database");
          res.status(201).json({success: true, message: "Account for " + user.fullName + " has been created."});
        }
      });
    }
  });
});

// Authenticate a user
router.post('/signin', function(req, res) {

  // Returns one User object if the email is found in database
  User.findOne({email: req.body.email}, function(err, user) {

    // Case where it cannot connect to database
    if (err) {
      res.status(401).json({ success: false, message: "Cannot connect to database." });
    }

    // Case where user is not found in database with given email
    else if (!user) {
      res.status(401).json({ success: false, message: "Email or password invalid." });
    }

    // Case where user was found in database but it will be authenticated
    else {
      bcrypt.compare(req.body.password, user.passwordHash, function(err, valid) {

        // There is an error with the code that it was unable to decrypt passwordHash
        if (err) {
          res.status(401).json({ success: false, message: "Error authenticating. Contact support." });
        }

        // Both password and uncrypted passwordHash match & authToken is created
        else if(valid) {
          let authToken = jwt.encode({email: req.body.email}, secret);
          res.status(201).json({ success: true, authToken: authToken });
        }

        // Authentication failed – password and passwordHash do not match
        else {
          res.status(401).json({ success: false, message: "Email or password invalid." });
        }
      });
    }
  });
});

// Retrieving account information
router.get('/account', function(req, res) {

  // Case where there does not exists an authToken
  if (!req.headers["x-auth"]) {
    res.status(401).json({ success: false, message: "No authentication token."});
    return;
  }

  // Retrieve authToken from headers and create accountInfo object
  let authToken = req.headers["x-auth"];
  let accountInfo = {};

  // Try-catch method is needed as authToken throws exception when it cannot be decoded
  try {

    // Token was decoded successfully
    let decodedToken = jwt.decode(authToken, secret);

    // Find user in database by searching for email
    User.findOne({email: decodedToken.email}, function(err, user) {

      // Error when contacting database
      if (err) {
        res.status(400).json({success: false, message: "Authentication token successful, but there is an error contacting database."});
      }

      if(user == null) {
        window.localStorage.removeItem("authToken");
        window.location.replace("signin.html");
      }

      // If successful, begin populating accountInfo object
      else {
        accountInfo["success"] = true;
        accountInfo["email"] = user.email;
        accountInfo["fullName"] = user.fullName;
        accountInfo["lastAccess"] = user.lastAccess;
        accountInfo["devices"] = [];
        accountInfo["readings"] = [];

        // Adding readings to the response object
        Reading.find({userEmail: decodedToken.email}, function(err, readings) {

          if(err) {
            res.status(400).json({success: false, message: "Error contacting database."});
          }

          else {

            for(let reading of readings) {
              accountInfo["readings"].push({date:             reading.date,
                                            averageHeartRate: reading.averageHeartRate,
                                            averageSPO2:      reading.averageSPO2});
            }
          }
        });

        // Searching for devices registered under an email to populate 'devices' array and display as account information
        Device.find({userEmail: decodedToken.email}, function(err, devices) {

          if(err) {
            res.status(400).json({success: false, message: "Error contacting database."});
          }

          // Iterating through found devices and adding them to 'devices' array under accountInfo
          else {

            for(let device of devices) {
              accountInfo['devices'].push({deviceId: device.deviceId, apiKey: device.apiKey});
            }
            res.status(200).json(accountInfo);
          }
        });
      }
    });
  }

  // Token was invalid
  catch (ex) {
    res.status(401).json({ success: false, message: "Invalid authentication token."});
  }
});

module.exports = router;
