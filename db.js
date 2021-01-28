var mongoose = require("mongoose");

mongoose.connect("mongodb://localhost/hearttrack", { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });

module.exports = mongoose;
