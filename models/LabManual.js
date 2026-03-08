const mongoose = require('mongoose');

const labManualSchema = new mongoose.Schema({
  department: {
    type: String,
    required: true,
    enum: [
      'Electrical Engineering',
      'Computer Engineering',
      'AI & Machine Learning',
      'Electronics & Communication'
    ]
  },
  semester:    { type: Number, required: true, min: 1, max: 6 },
  subjectCode: { type: String, trim: true },           // e.g. "22318"
  subjectName: { type: String, required: true, trim: true }, // e.g. "Power Electronics"
  description: { type: String, trim: true },
  pdfUrl:       { type: String, default: null },
  pdfPublicId:  { type: String, default: null },
  pdfName:      { type: String, default: null },
  isActive:     { type: Boolean, default: true },
  academicYear: { type: String, trim: true },
  order:        { type: Number, default: 0 },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now }
});

labManualSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('LabManual', labManualSchema);
