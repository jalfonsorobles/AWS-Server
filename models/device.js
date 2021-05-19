let db = require("../db");

let deviceSchema = new db.Schema({
    apiKey:               String,
    deviceId:             String,
    userEmail:            String,
    startHour:            { type: Number, default: 6 },
    endHour:              { type: Number, default: 22 },
    operatingFrequency:   { type: Number, default: 30 },
    lastContact:          { type: Date, default: Date.now }
});

var Device = db.model("Device", deviceSchema);

module.exports = Device;
