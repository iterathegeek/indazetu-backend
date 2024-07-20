const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const shopDataSchema = new mongoose.Schema({
  shop: {
    type: String,
    required: true,
  },

  postContent: {
    type: String,
  },

  postTitle: {
    type: String,
  },
  postTag: {
    type: Array,
  },
  homeContent: {
    type: String,
  },
  homeTag: {
    type: Array,
  },
  shippingInputs:{
    type :Array 
  },
  returnPolicy: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  postType:{
    type :String ,
    default: "blog"
  },

});


module.exports = mongoose.model("ShopPost", shopDataSchema);
