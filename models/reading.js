let db = require("../db");

let userSchema = new db.Schema({
  userEmail:        String,
  date:             { type: Date, default: Date.now },
  averageHeartRate: [ Number ],
  averageSPO2:      [ Number ]
});

let Reading = db.model("Reading", userSchema);

module.exports = Reading;
