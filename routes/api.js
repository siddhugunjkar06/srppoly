const express = require('express');
const router = express.Router();
const Notice  = require('../models/Notice');
const Enquiry = require('../models/Enquiry');
const Contact = require('../models/Contact');

// GET latest notices for ticker/homepage live updates
router.get('/notices', async (req, res) => {
  try {
    const notices = await Notice.find().sort({ publishedAt: -1 }).limit(10).lean();
    res.json({ success: true, data: notices });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST enquiry via AJAX
router.post('/enquiry', async (req, res) => {
  try {
    const { fname, lname, email, phone, dept, marks, category, message } = req.body;
    if (!fname || !email || !phone || !dept) {
      return res.status(400).json({ success: false, message: 'Required fields missing.' });
    }
    const enquiry = await Enquiry.create({ firstName: fname, lastName: lname, email, phone, department: dept, marks, category, message });
    res.json({ success: true, message: `Thank you ${fname}! We'll contact you within 24 hours.`, id: enquiry._id });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// POST contact via AJAX
router.post('/contact', async (req, res) => {
  try {
    const { c_name, c_email, c_phone, c_subject, c_message } = req.body;
    if (!c_name || !c_email || !c_message) {
      return res.status(400).json({ success: false, message: 'Required fields missing.' });
    }
    await Contact.create({ name: c_name, email: c_email, phone: c_phone, subject: c_subject, message: c_message });
    res.json({ success: true, message: `Thank you ${c_name}! We'll respond to ${c_email} shortly.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

module.exports = router;
