const express = require("express");
const { isSeller, isAuthenticated, isAdmin } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const router = express.Router();
const Product = require("../model/product");
const Order = require("../model/order");
const Shop = require("../model/shop");
const cloudinary = require("cloudinary");
const ErrorHandler = require("../utils/ErrorHandler");
const ShippingCost = require("../model/shippingCosts")
// Get all shipping costs
router.get('/get-all-shipping-costs', catchAsyncErrors(async (req, res, next) => {
  try {
    const shippingCosts = await ShippingCost.find();
    res.status(200).json({
      success: true,
      shippingCosts,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));

router.get('/get-shipping-cost/:id', catchAsyncErrors(async (req, res, next) => {
  try {
    const shippingCost = await ShippingCost.findById(req.params.id);

    if (!shippingCost) {
      return next(new ErrorHandler('Shipping cost not found', 404));
    }

    res.status(200).json({
      success: true,
      shippingCost
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));

// Create a new shipping cost
router.post('/create-shipping-cost', catchAsyncErrors(async (req, res, next) => {
  try {
    const { shop, shippingInputs } = req.body;
    const newShippingCost = await ShippingCost.create({ shop, shippingInputs });
    res.status(201).json({
      success: true,
      shippingCost: newShippingCost,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));

// Update a shipping cost
router.put('/update-shipping-cost/:id', catchAsyncErrors(async (req, res, next) => {
  try {
    const { shop, shippingInputs } = req.body;

    const updatedShippingCost = await ShippingCost.findOneAndUpdate(
      { shop, _id: req.params.id },
      { shippingInputs },
      { new: true } // Return the updated document
    );

    if (!updatedShippingCost) {
      return next(new ErrorHandler("Shipping cost doesn't exist", 400));
    }

    res.status(201).json({
      success: true,
      shippingCost: updatedShippingCost,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));

// Delete a shipping cost
router.delete('/delete-shipping-cost/:id', catchAsyncErrors(async (req, res, next) => {
  try {
    const deletedShippingCost = await ShippingCost.findByIdAndDelete(req.params.id);

    if (!deletedShippingCost) {
      return next(new ErrorHandler('Shipping cost not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Shipping cost deleted successfully',
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));

module.exports = router;
