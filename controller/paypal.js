const express = require('express');
const paypal = require('paypal-rest-sdk');

const router = express.Router();

paypal.configure({
  mode: 'sandbox', // Change this to 'live' for production
  client_id: 'AWKgpLft7nF0wjsDANPkN4BucUKAceDTECB6RyX-V9Xt2OdfTPEVCFAHnktTD6529XQidt7J1ea7kLBS',
  client_secret: 'EKHvpYo49wK58i6TEnzIpT7X_SKb4u8PuAjG254lVZI_CJLFjn-JnHSybLagNPS3FuITXtNlj8OSebCa',
});

router.post('/create-payment', async (req, res) => {
  const create_payment_json = {
    intent: 'sale',
    payer: {
      payment_method: 'paypal',
    },
    transactions: [
      {
        amount: {
          total: '10.00', // Set your total amount here
          currency: 'USD', // Set your currency code here
        },
        description: 'My PayPal Test Transaction',
        payment   },
    ],
    redirect_urls: {
      return_url: 'http://localhost:3000/success', // Set your return URL here
      cancel_url: 'http://localhost:3000/cancel', // Set your cancel URL here
    },
  };

  paypal.payment.create(create_payment_json, (error, payment) => {
    if (error) {
      throw error;
    } else {
      for (let i = 0; i < payment.links.length; i++) {
        if (payment.links[i].rel === 'approval_url') {
          res.json({ approvalUrl: payment.links[i].href });
        }
      }
    }
  });
});

router.post('/execute-payment', async (req, res) => {
  const payerId = req.body.payerId;
  const paymentId = req.body.paymentId;

  const execute_payment_json = {
    payer_id: payerId,
  };

  paypal.payment.execute(paymentId, execute_payment_json, (error, payment) => {
    if (error) {
      console.error(error.response);
      res.status(500).json({ error: 'Payment execution failed' });
    } else {
      // Handle successful payment execution
      console.log(JSON.stringify(payment));
      res.json({ success: true });
    }
  });
});

module.exports = router;
