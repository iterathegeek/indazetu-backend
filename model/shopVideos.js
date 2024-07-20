const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const shopDataSchema = new mongoose.Schema({
  shop: {
    type: String,
    required: true,
  },


  video: {
    type: String
  },


  createdAt: {
    type: Date,
    default: Date.now(),
  },

});


module.exports = mongoose.model("ShopVideos", shopDataSchema);
