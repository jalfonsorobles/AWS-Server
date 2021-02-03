const express = require('express');
let router = express.Router();

let Device = require('../models/device');
let User = require('../models/users');

// Register a sensor reading
router.post('/data', function(req, res) {

  let responseJson = {
    posted: false,
    message : "",
    apikey : "none",
    deviceId : "none"
  };

  console.log(req.body.bpm);
  console.log("data was added successfully to database");
  res.status(201).json({success: true, message: "bpm of " + req.body.bpm + " was received."});

});

module.exports = router;
