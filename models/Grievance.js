const mongoose = require('mongoose');

const grievanceSchema = new mongoose.Schema({
  srNo:        { type: Number, required: true },
  name:        { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  pdfUrl:      { type: String, default: null },   // Cloudinary PDF URL
  pdfPublicId: { type: String, default: null },   // For deletion
  pdfName:     { type: String, default: null },   // Original filename shown to user
  isActive:    { type: Boolean, default: true },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now }
});

grievanceSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Grievance', grievanceSchema);
