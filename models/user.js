let db = require("../db");

let userSchema = new db.Schema({
  fullName:         { type: String, required: true },
  email:            { type: String, required: true, unique: true },
  passwordHash:     { type: String, required: true },
  dateRegistered:   { type: Date, default: Date.now },
  lastAccess:       { type: Date, default: Date.now },
  userDevices:      [ String ],
  averageHeartRate: [ Number ],
  averageSPO2:      [ Number ],
  alertFlag:        [ Boolean ]
});

let User = db.model("User", userSchema);

module.exports = User;
