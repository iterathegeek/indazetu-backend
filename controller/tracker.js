const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Use the Google Analytics Data API
const analyticsdata = google.analyticsdata('v1beta');

router.get('/analytics', async (req, res) => {
  const { sellerId, startDate, endDate } = req.query;

  if (!sellerId) {
    return res.status(400).json({ error: 'sellerId is required' });
  }

  try {

    // Read service account credentials
  //  const credentialsPath = path.join(__dirname, '../dialogflow-cx-project-421407-6c0e71d6646c.json');
    const credentialsPath = path.join(__dirname,process.env.ga_tracker );

    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

    // Create JWT client for authentication
    const jwtClient = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
      project_id: credentials.project_id,
    });

    // Authorize the client
    await jwtClient.authorize();

    const reportRequest = {
      property: 'properties/226579595', // Replace with your actual GA4 Property ID
      dateRanges: [{ startDate: startDate || '2024-01-01', endDate: endDate || '2024-01-31' }],
      dimensions: [
        { name: 'eventName' },
        { name: 'customEvent:sellerId' },
        { name: 'date' },
        { name: 'city' },
        { name: 'pagePath' },
        { name: 'pageTitle' },
        // { name: "activeUsers" },
        // { name: "sessions" },
        // { name: "newUsers" },
        // { name: "screenPageViews" },
        // { name: "engagementRate" },
        // { name: "conversions" },
        // { name: "transactions" },
        //{ name: "bounceRate" },
        // { name: "TotalUsers" }

      ],
      metrics: [{ name: 'eventCount'},
      { name: 'newUsers' },
      { name: 'screenPageViews' },
      { name: 'engagementRate' },
      { name: 'conversions' },
      { name: 'transactions' },
      { name: 'bounceRate' },
      { name: 'totalUsers' }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            {
              filter: {
                fieldName: 'eventName',
                stringFilter: {
                  matchType: 'EXACT',
                  value: 'page_view', // Filter by the 'page_view' event
                }
              }
            },
            {
              filter: {
                fieldName: 'customEvent:sellerId', // Ensure this matches the correct field name
                stringFilter: {
                  matchType: 'EXACT',
                  value: sellerId, // Filter by the seller ID you want
                }
              }
            }
          ]
        }
      }
    };


    const response = await analyticsdata.properties.runReport({
      property: reportRequest.property,
      requestBody: reportRequest,
      auth: jwtClient,
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching Firebase Analytics data:', error);
    // Respond with a 500 status code and error message
    res.status(500).json({ error: 'Error fetching Firebase Analytics data' });
  }
});

// Global error handler to catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Handle the error gracefully (e.g., log it, notify an admin, etc.)
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Handle the error gracefully (e.g., log it, notify an admin, etc.)
  // Optionally, exit the process with a non-zero exit code
  process.exit(1);
});

module.exports = router;
