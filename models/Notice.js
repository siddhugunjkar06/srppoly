const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title:     { type: String, required: true, trim: true },
  content:   { type: String, required: true },
  category:  { type: String, enum: ['Academic', 'Admission', 'Examination', 'Event', 'General'], default: 'General' },
  isNew:     { type: Boolean, default: true },
  isImportant: { type: Boolean, default: false },
  publishedAt: { type: Date, default: Date.now },
  expiresAt:    { type: Date },
  externalLink: { type: String, trim: true, default: '' },   // optional URL
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notice', noticeSchema);
