// routes/contactUs.js
const express = require("express");
const router = express.Router();
const ContactUs = require("../models/ContactUs");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const sendMail = require("../utils/sendMail");


const validateContactForm = ({ name, email, message }) => {
  if (!name || !email || !message) {
    return "All fields are required.";
  }

  if (!validator.isEmail(email)) {
    return "Invalid email address.";
  }

  if (message.length < 10) {
    return "Message should be at least 10 characters long.";
  }

  return null;
};

router.post(
  "/create-new-message",
  catchAsyncErrors(async (req, res, next) => {
    const { name, email, message } = req.body;

    // Validate input
    const validationError = validateContactForm({ name, email, message });
    if (validationError) {
      return next(new ErrorHandler(validationError, 400));
    }

    try {
      const newMessage = new ContactUs({ name, email, message });
      await newMessage.save();

      // Send email to admin
      await sendMail({
        to: process.env.ADMIN_EMAIL,
        subject: "New Message from Contact Us Form",
        text: `New message from ${name} - ${email}:\n\n${message}`,
      });

      // Send email to support and user
      await sendMail({
        to: [process.env.SUPPORT_EMAIL, email],
        subject: "Thank you for your message",
        text: "Thank you for reaching out to us. We'll get back to you soon.",
      });

      res.status(201).json({
        success: true,
        message: "Message sent successfully!",
        data: newMessage,
      });
    } catch (error) {
      return next(new ErrorHandler("Failed to send message, please try again later.", 500));
    }
  })
);
// get all messages
router.get(
  "/get-all-messages",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const messages = await ContactUs.find();

      res.status(200).json({
        success: true,
        messages,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message), 500);
    }
  })
);

module.exports = router;
