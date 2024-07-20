const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const shopDataSchema = new mongoose.Schema({
  shop: {
    type: String,
    required: true,
  },

  image: {
    type: Object
  },

  createdAt: {
    type: Date,
    default: Date.now(),
  },

});


module.exports = mongoose.model("ShopImage", shopDataSchema);
