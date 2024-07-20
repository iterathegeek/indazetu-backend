const mongoose = require('mongoose');

const pickupStationSchema = new mongoose.Schema({
  stationName: {
    type: String,
    required: true,
  },
  address: {
    type: Object,
    required: true,
  },
  workingHours: {
    type: String,
    required: true,
  },
  days: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  paymentOption: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  county: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  // coordinates: {
  //   lat: {
  //     type: Number,
  //     required: true,
  //   },
  //   lng: {
  //     type: Number,
  //     required: true,
  //   },
  // },
});

const PickupStation = mongoose.model('PickupStation', pickupStationSchema);

module.exports = PickupStation;
