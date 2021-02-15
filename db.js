var mongoose = require("mongoose");

mongoose.connect("mongodb://localhost/hearttrack", {useNewUrlParser: true, useUnifiedTopology: true,
                                                    useFindAndModify: false, useCreateIndex: true });

module.exports = mongoose;
