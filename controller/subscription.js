const express = require('express');
const Subscription = require('../model/subscription');
const ErrorHandler = require('../utils/ErrorHandler');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');

const router = express.Router();

router.post('/subscribe', catchAsyncErrors(async (req, res, next) => {
    console.log('email',req.body);
  const { email } = req.body;

  console.log('email',email);
  if (!email) {
    return next(new ErrorHandler('Email is required', 400));
  }

  try {
  //  console.log('email2',subscription);
    let subscription = await Subscription.findOne({ email });
    console.log('email2',subscription);

    if (subscription) {
      return next(new ErrorHandler('You are already subscribed', 400));
    }


    console.log('email3',subscription);
    subscription = new Subscription({ email });
    await subscription.save();
    console.log('email4',subscription,res);
    res.status(201).json({
      success: true,
      message: 'Thank you for subscribing!',
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));

module.exports = router;
