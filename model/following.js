const mongoose = require('mongoose');
const User = require('./user');
const Shop = require('./shop');


const followingSchema = new mongoose.Schema({
  follower:{
    type: String,
    required: [true],
  },
  followee: { type: String, required: [true] },
  isFollowing: { type: Boolean, default: false }
});

module.exports = mongoose.model('Following', followingSchema);
