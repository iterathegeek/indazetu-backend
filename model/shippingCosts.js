const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const shippingDataSchema = new mongoose.Schema({
  shop: {
    type: String,
    required: true,
  },

  shippingInputs: {
    type: Array
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  updatedAt: {
    type: Date,
    default: Date.now(),
  },


});

shippingDataSchema.pre('save', function (next) {
  this.updatedAt = Date.now(); // Update updatedAt before saving
  next();
});


module.exports = mongoose.model("ShippingCost", shippingDataSchema);
