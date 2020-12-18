const express = require('express');
let router = express.Router();

let Device = require('../models/device');
let User = require('../models/users');

// Register a sensor readign
router.post('/hearttrack', function(req, res) {

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

      console.log(newUser);

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