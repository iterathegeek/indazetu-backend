// controllers/notificationController.js

const express = require('express');
const router = express.Router();
const Notification = require('../model/notification');
const axios = require('axios');
const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');
const path = require('path');
const Shop = require("../model/shop");
const generateOTP = require("../utils/otp")
const User = require("../model/user");
const sendToken = require("../utils/jwtToken");

// var transporter = nodemailer.createTransport({
//   host: "sandbox.smtp.mailtrap.io",
//   port: 2525,
//   auth: {
//     user: "0383ab8026ca26",
//     pass: "479a5eebb9cded"
//   }
// });
var transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 587,
  auth: {
    user: "support@indazetu.com",
    pass: "v7'}Zrbj]PrN!Fh"
  }
});
// Configure Handlebars
const handlebarOptions = {
  viewEngine: {
    extName: ".hbs",
    partialsDir: path.resolve('./templates/'),
    defaultLayout: false,
  },
  viewPath: path.resolve('./templates/'),
  extName: ".hbs",
};

transporter.use('compile', hbs(handlebarOptions));






const generateMessageEmailTemplate = async ({ subject, message }) => {
  return `
  <div style="width: 90%; max-width: 1000px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
  <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
    <img src="https://img.freepik.com/premium-vector/otp-onetime-password-2step-authentication-data-protection-internet-security-concept_100456-10200.jpg" alt="Activation Icon" style="width: 40px; height: auto; margin-right: 10px;">
    <h2 style="font-size: 24px; margin: 0; font-weight: 600; color: #007bff;">${subject}</h2>
  </div>
  
  <div style="font-size: 16px; line-height: 1.5; background-color: #f4f4f4; padding: 15px; border-radius: 8px;">
    ${message}
  </div>

  <div style="text-align: center; padding: 10px; font-size: 14px; color: #555; margin-top: 20px; border-top: 1px solid #ddd;">
    <p>Thank you for choosing us!</p>
  </div>
</div>
  `;
};


const generateOrderEmailTemplate = async (order) => {
  const orderItemsHtml = await Promise.all(order?.cart?.map(async (item) => {
    const seller = await Shop.findById(item.shopId);

    if (!seller) {
      throw new Error("User doesn't exist");
    }

    return `
      <tr>
        <td data-label="Seller">
          <div class="seller-info">
            <img src="${seller.avatar.url}" alt="${seller.name}" width="50" />
            <strong>${seller.name}</strong>
          </div>
        </td>
        <td data-label="Product">${item.name}</td>
        <td data-label="Color">${item.selectedColor}</td>
        <td data-label="Quantity">${item.qty}</td>
        <td data-label="Price">${item.priceInput[0].discountPrice || item.priceInput[0].price}</td>
        <td data-label="Image"><img src="${item.images[0].url}" alt="${item.name}" width="50" /></td>
      </tr>
    `;
  }));

  const formattedDate = new Date(order.createdAt).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: 'Helvetica Neue', Arial, sans-serif;
        color: #333;
        line-height: 1.6;
        padding: 20px;
        background-color: #f9f9f9;
      }
      .container {
        max-width: 1000px;
        margin: 0 auto;
        background-color: #fff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 10px  #FFDBBB;;
      }
      .header {
        display: flex;
        align-items: center;
        margin-bottom: 20px;
      }
      .header img {
        width: 50px;
        margin-right: 15px;
      }
      .header h2 {
        font-size: 24px;
        color: #333;
        margin: 0;
      }
      h3 {
        color: #333;
        margin-top: 30px;
      }
      .order-info {
        background-color: #f4f4f4;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
        font-size: 16px;
      }
      .order-info strong {
        display: block;
        margin-bottom: 5px;
      }
      .shop-details {
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid #eaeaea;
      }
      .shop-details img {
        border-radius: 50%;
        max-width: 50px;
        height: auto;
      }
      .seller-info {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .seller-info img {
        border-radius: 50%;
        width: 50px;
        height: 50px;
      }
      .seller-info strong {
        font-size: 16px;
        color: #333;
      }
      @media only screen and (max-width: 600px) {
        .seller-info {
          flex-direction: column;
          align-items: flex-start;
        }
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      th, td {
        padding: 12px;
        border: 1px solid #eaeaea;
        text-align: left;
      }
      th {
        background-color: #f2f2f2;
      }
      @media only screen and (max-width: 800px) {
        .container {
          padding: 10px;
        }
        .header img {
          width: 40px;
          margin-right: 10px;
        }
        .header h2 {
          font-size: 20px;
        }
        .shop-details {
          font-size: 14px;
        }
        table {
          width: 100%;
        }
        thead {
          display: none;
        }
        tr {
          display: block;
          margin-bottom: 10px;
          border-bottom: 2px solid #eaeaea;
          padding-bottom: 10px;
        }
        td {
          display: block;
          text-align: right;
          font-size: 14px;
          border: none;
          position: relative;
          padding-left: 50%;
        }
        td::before {
          content: attr(data-label);
          position: absolute;
          left: 10px;
          width: 50%;
          padding-right: 10px;
          white-space: nowrap;
          text-align: left;
          font-weight: bold;
        }
        td:last-child {
          border-bottom: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="order-info">
        <strong>Order Number: ${order._id}</strong>
     
      </div>
      <p>You have a new order. Order details are as follows:</p>
      <table>
        <thead>
          <tr>
            <th>Seller</th>
            <th>Product</th>
            <th>Color</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Image</th>
          </tr>
        </thead>
        <tbody>
          ${orderItemsHtml.join('')}
        </tbody>
      </table>
      <h3>Order Details:</h3>
      <small><strong>Order Status:</strong> ${order.status}</small>
      <small><strong>Payment Method:</strong> ${order.paymentInfo.type}</small>
      <small><strong>Payment Time:</strong> ${formattedDate}</small>
      !order  </body>
  </html>
  `;
};

// Example usage:
// generateEmailTemplate(order).then(template => console.log(template)).catch(err => console.error(err));

// Email notification route
router.post('/email', async (req, res) => {
  try {
    const { recipient, subject, message, order } = req.body;
    console.log('zakayo', req.body);
    let htmlContent;
    if (order) {
      htmlContent = await generateOrderEmailTemplate(order);
      console.log(htmlContent)
    }
    if (!order) {
      console.log(subject, message)
      htmlContent = await generateMessageEmailTemplate({ subject, message });

      console.log(htmlContent)
    }
    // Email options
    const mailOptions = {
      from: 'support@indazetu.com',
      to: recipient,
      subject: subject,
      template: 'email', // The name of the template file without extension
      context: {
        subject: subject,
        message: message,
        htmlContent: htmlContent, // Pass htmlContent to the context
      },
    };

    // Send email
    const response = await transporter.sendMail(mailOptions);

    // Save notification data to MongoDB
    const notification = new Notification({
      type: 'email',
      recipient,
      subject,
      message,
      status: response.response // assuming response.response contains the status
    });
    await notification.save();

    res.status(200).json({ message: 'Email notification triggered and saved to database' });
  } catch (error) {
    console.error('Error triggering email notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// SMS notification route
router.post('/sms', async (req, res) => {
  try {
    // Simulate sending SMS using dummy API call
    const { recipient, message } = req.body;


    const credentials = {
      apiKey: '286079f70d71069a505afa38abc8957dc3e896e13f5fb24a006fde8e60b2fbc7',         // use your sandbox app API key for development in the test environment
      username: 'sandbox',      // use 'sandbox' for development in the test environment
    };
    const AfricasTalking = require('africastalking')(credentials);

    // Initialize a service e.g. SMS
    const sms = AfricasTalking.SMS

    // Use the service
    const options = {
      to: ['+254703153668', '+254702966473'],
      message: "I'm a lumberjack and its ok, I work all night and sleep all day"
    }


    // Send message and capture the response or error
    const response = sms.send(options)
      .then(response => {
        console.log(response);
      })
      .catch(error => {
        console.log(error);
      });

    console.log(response);
    // Save notification data to MongoDB
    const notification = new Notification({
      type: 'sms',
      recipient,
      content: message,
      status: response
    });
    await notification.save();

    res.status(200).json({ message: 'SMS notification triggered and saved to database' });
  } catch (error) {
    console.error('Error triggering SMS notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.post('/verify-otp', async (req, res) => {
  const { email, otp, type } = req.body;

  try {
    if (type === 'user') {
      const user = await User.findOne({ email });

      if (!user || user.otp !== otp) {
        return res.status(400).json({ message: 'Invalid OTP' });
      }

      user.otp = null;  // Clear the OTP after verification
      await user.save();

     return sendToken(user, 200, res);
    }


    if (type === 'shop') {
      const { email, otp, password } = req.body;

      const shop = await Shop.findOne({ email });

      if (!shop || shop.otp !== otp) {
        return next(new ErrorHandler("Invalid OTP", 400));
      }

      // Clear the OTP after successful verification
      shop.otp = null;
      await shop.save();
      console.log('dad', shop);
      // Send shop token (JWT) after successful OTP verification
      return sendShopToken(shop, 200, res);
    }

    // If no shop matched, send a generic error response
    return res.status(400).json({ message: 'Invalid OTP or type' });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});




// router.post('/send-otp', async (req, res) => {
//   const { email, type } = req.body;
//   const otp = generateOTP();
//   try {
//     if (type === 'user') {
//       const user = await User.findOne({ email });

//       if (!user) {
//         return res.status(404).json({ message: 'User not found' });
//       }
//       console.log('email','type', user);

//       user.otp = otp; // Store the OTP in the user's record (make sure you have an `otp` field in your User model)
//       // user.phoneNumber=otp;
//       console.log('email2', otp);
//       await user.save();

//       console.log('zero', user);
//     }
//     else if (type === 'shop') {
//       const shop = await Shop.findOne({ email });
//       console.log('shop', shop);
//       if (!shop) {
//         return res.status(404).json({ message: 'Shop not found' });
//       }

//       shop.otp = otp;
//       await shop.save();
//     }
//     const subject = 'Your OTP Code';
//     const message = `Your OTP code is ${otp}`;
//     const htmlContent = await generateMessageEmailTemplate({ subject, message });
//     const mailOptions = {
//       from: 'adrian@indazetu.com',
//       to: email,
//       subject: subject,
//       template: 'email', // The name of the template file without extension
//       context: {
//         subject: subject,
//         message: message,
//         htmlContent: htmlContent, // Pass htmlContent to the context
//       },
//     }

//     await transporter.sendMail(mailOptions);

//     res.status(200).json({ message: 'OTP sent to your email' });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });


router.post('/send-otp', async (req, res) => {
  const { email, type } = req.body;
  const otp = generateOTP();

  try {
    if (type === 'user') {
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      user.otp = otp;  // Store OTP in the user's record
      await user.save();

      const subject = 'Your OTP Code';
      const message = `Your OTP code is ${otp}`;
      const htmlContent = await generateMessageEmailTemplate({ subject, message });

      const mailOptions = {
        from: 'support@indazetu.com',
        to: email,
        subject: subject,
        template: 'email',
        context: { subject, message, htmlContent },
      };

      await transporter.sendMail(mailOptions);

      res.status(200).json({ message: 'OTP sent to your email' });
    }
    if (type === 'shop') {
      const shop = await Shop.findOne({ email });

      if (!shop) {
        return res.status(404).json({ message: 'User not found' });
      }

      shop.otp = otp;  // Store OTP in the user's record
      await shop.save();

      const subject = 'Your OTP Code';
      const message = `Your OTP code is ${otp}`;
      const htmlContent = await generateMessageEmailTemplate({ subject, message });

      const mailOptions = {
        from: 'support@indazetu.com',
        to: email,
        subject: subject,
        template: 'email',
        context: { subject, message, htmlContent },
      };

      await transporter.sendMail(mailOptions);

      res.status(200).json({ message: 'OTP sent to your email' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});




module.exports = router;
