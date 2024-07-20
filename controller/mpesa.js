

const express = require('express');
const axios = require("axios");
const fs = require("fs");
const moment = require("moment");
const router = express.Router();


// Sample API route
router.get('/home', (req, res) => {
  res.json({ message: 'This is a sample API route.' });
  console.log("This is a sample API route.");
});

router.get("/access_token", (req, res) => {
  getAccessToken()
    .then((accessToken) => {
      res.json({ message: "😀 Your access token is " + accessToken });
    })
    .catch(console.log);
});

async function getAccessToken() {
  const consumer_key = "skJ1uP5APphiGg1NAfyeA3N9xLgxkw4f"; // REPLACE IT WITH YOUR CONSUMER KEY
  const consumer_secret = "SwcBadhGctaBEDkT"; // REPLACE IT WITH YOUR CONSUMER SECRET
  //   const url =
  //     "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
  let url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"


  const auth =
    "Basic " +
    new Buffer.from(consumer_key + ":" + consumer_secret).toString("base64");

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: auth,
      },
    });
    const accessToken = response.data.access_token;
    return accessToken;
  } catch (error) {
    throw error;
  }
}

router.post('/stkpush',async (req, res) => {
  try {
    let phoneNumber = req.body.mpesaNumber;
    const accountNumber = req.body.accountNumber;
    const amount = req.body.amount;

    if (phoneNumber.startsWith("0")) {
      phoneNumber = "254" + phoneNumber.slice(1);
    }


    const accessToken = await getAccessToken();
    const url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
    const auth = "Bearer " + accessToken;
    const timestamp = moment().format("YYYYMMDDHHmmss");
    const password = new Buffer.from(
      "174379" +
      "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919" +
      timestamp
    ).toString("base64");


    console.log('we are here',req.body);
    const response = await axios.post(
      url,
      {
        BusinessShortCode: "174379",
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: "174379",
        PhoneNumber: phoneNumber,
        CallBackURL: "https://249e-105-60-226-239.ngrok-free.app/api/callback",
        AccountReference: accountNumber,
        TransactionDesc: "Mpesa Daraja API stk push test",
      },
      {
        headers: {
          Authorization: auth,
        },
      }
    );

    // Send back a JSON response to the client
    console.log(response.data);
    res.status(200).json({
      msg: "Request is successful done ✔✔. Please enter mpesa pin to complete the transaction",
      status: true,
    });
  } catch (error) {
    // Send an error JSON response to the client
    console.error(error);
    res.status(500).json({
      msg: "Request failed",
      status: false,
    });
  }
});




router.post("/callback", (req, res) => {
  console.log("STK PUSH CALLBACK");
  console.log("The endpoint has been hit");

  //const { orderID } = req.params;
  const merchantRequestID = req.body.Body.stkCallback.MerchantRequestID;
  const checkoutRequestID = req.body.Body.stkCallback.CheckoutRequestID;
  const resultCode = req.body.Body.stkCallback.ResultCode;
  const resultDesc = req.body.Body.stkCallback.ResultDesc;
  const callbackMetadata = req.body.Body.stkCallback.CallbackMetadata;
  const amount = callbackMetadata.Item[0].Value;
  const mpesaReceiptNumber = callbackMetadata.Item[1].Value;
  const transactionDate = callbackMetadata.Item[3].Value;
  const phoneNumber = callbackMetadata.Item[4].Value;

  console.log("MerchantRequestID:", merchantRequestID);
  console.log("CheckoutRequestID:", checkoutRequestID);
  console.log("ResultCode:", resultCode);
  console.log("ResultDesc:", resultDesc);

  console.log("Amount:", amount);
  console.log("MpesaReceiptNumber:", mpesaReceiptNumber);
  console.log("TransactionDate:", transactionDate);
  console.log("PhoneNumber:", phoneNumber);

  var json = JSON.stringify(req.body);
  fs.writeFile("stkcallback.json", json, "utf8", function (err) {
    if (err) {
      return console.log(err);
    }
    console.log("STK PUSH CALLBACK STORED SUCCESSFULLY");
  });
});


// Other API routes go here...

module.exports = router;





