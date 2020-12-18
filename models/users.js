let db = require("../db");

let userSchema = new db.Schema({
  fullName:         { type: String, required: true },
  email:            { type: String, required: true, unique: true },
  passwordHash:     String,
  dateRegistered:   { type: Date, default: Date.now },
  lastAccess:       { type: Date, default: Date.now },
  userDevices:      [ String ],
  averageHeartRate: [ { average: Number, readings: Number } ]
});

let User = db.model("User", userSchema);

module.exports = User;
  