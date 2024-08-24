
const express = require('express');
const router = express.Router();
const Notification = require('../model/notification');
const axios = require('axios');
const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');
const path = require('path');
const Shop = require("../model/shop");


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
    user: "adrian@indazetu.com",
    pass: "sidundo@36"
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

    <style>
    
    .header img {
      width: 40px;
      height: 40px;
      margin-right: 15px;
    }
    
    .header h2 {
      font-size: 26px;
      color: #333;
      margin: 0;
      flex-grow: 1;
      font-weight: 600;
    }
    
      .message {
        font-size: 16px;
        color: #333;
        background-color: #f4f4f4;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
      }
      @media (max-width: 600px) {
        .header {
          flex-direction: column;
          align-items: flex-start;
          padding: 10px 15px;
        }
      
        .header h2 {
          font-size: 22px;
          margin-top: 10px;
        }
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
        .message {
          font-size: 14px;
        }
      }
    </style>
 

    <div class="container">
    <div class="header">
    <img src="https://img.icons8.com/ios-filled/50/000000/key.png" alt="Activation Icon">
    <h2>${subject}</h2>
  </div>
  
  </div>
      <div class="message">
        ${message}
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
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
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

const sendMail = async (options) => {
  try {
    const { email, subject, message, order } = options;

    console.log('Options:', options);

    let htmlContent;
    if (order) {
      htmlContent = await generateOrderEmailTemplate(order);
      console.log('Order Email Content:', htmlContent);
    } else {
      htmlContent = await generateMessageEmailTemplate({ subject, message });
      console.log('Message Email Content:', htmlContent);
    }

    // Email options
    const mailOptions = {
      from: 'adrian@indazetu.com',
      to: email,
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

    console.log('Email Response:', response);

    // Save notification data to MongoDB
    const notification = new Notification({
      type: 'email',
      recipient: email,
      subject: subject,
      message: message,
      status: response.response, // assuming response.response contains the status
    });
    await notification.save();

    // Send response back to client
    return {
      status: 200,
      json: { message: 'Email notification triggered and saved to database' },
    };
  } catch (error) {
    console.error('Error triggering email notification:', error);
    return {
      status: 500,
      json: { error: 'Internal server error' },
    };
  }
};


module.exports = sendMail;
