const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Define a schema for the page event
const pageEventSchema = new mongoose.Schema({
  device: Object,
  location: Object,
  timestamp: Date,
  page: String,
  referrer: String,
  userAgent: String,
  impressions: Number,
  visitors: Number,
  phoneViews: Number,
  chatRequests: Number
});

const PageEvent = mongoose.model('PageEvent', pageEventSchema);

// Endpoint to track page events
router.post('/track-event', async (req, res) => {
  const eventData = req.body;
  const pageEvent = new PageEvent(eventData);
  console.log('Tracking data received:', eventData);
  try {
    await pageEvent.save();
    res.status(201).json({ success: true, event: pageEvent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// Endpoint to fetch page event data within a date range
router.get('/events', async (req, res) => {
  const { start, end } = req.query;
  console.log('pageEven',start,end)
  try {
    const events = await PageEvent.find({
      timestamp: { $gte: new Date(start), $lte: new Date(end) }
    });
    console.log('pageEven',events)
    res.json(events);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
