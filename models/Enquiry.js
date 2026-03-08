const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName:  { type: String, trim: true },
  email:     { type: String, required: true, trim: true, lowercase: true },
  phone:     { type: String, required: true, trim: true },
  department:{ type: String, required: true },
  marks:     { type: String },
  category:  { type: String, default: 'General' },
  message:   { type: String },
  status:    { type: String, enum: ['New', 'Contacted', 'Enrolled', 'Rejected'], default: 'New' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Enquiry', enquirySchema);
