const express = require("express");
const { isSeller, isAuthenticated, isAdmin } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const router = express.Router();
const Product = require("../model/product");
const Order = require("../model/order");
const Shop = require("../model/shop");
const cloudinary = require("cloudinary");
const ErrorHandler = require("../utils/ErrorHandler");
const PickupStation = require('../model/PickupStation');

// Get all pickup stations
router.get('/get-all-pickupstations', catchAsyncErrors(async (req, res, next) => {
  try {
    const pickupStations = await PickupStation.find();
    res.status(200).json({
      success: true,
      pickupStations,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));

// Create a new pickup station
router.post('/create-pickupstation', catchAsyncErrors(async (req, res, next) => {
  try {
    const newPickupStation = new PickupStation(req.body);
    const savedPickupStation = await newPickupStation.save();
    res.status(201).json({
      success: true,
      pickupStation: savedPickupStation,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));

// Update a pickup station
router.put('/update-pickupstation/:id', catchAsyncErrors(async (req, res, next) => {
  try {
    const updatedPickupStation = await PickupStation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedPickupStation) {
      return next(new ErrorHandler('Pickup station not found', 404));
    }

    res.status(200).json({
      success: true,
      pickupStation: updatedPickupStation,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));

// Delete a pickup station
router.delete('/delete-pickupstation/:id', catchAsyncErrors(async (req, res, next) => {
  try {
    const deletedPickupStation = await PickupStation.findByIdAndDelete(req.params.id);

    if (!deletedPickupStation) {
      return next(new ErrorHandler('Pickup station not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Pickup station deleted successfully',
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));

module.exports = router;
