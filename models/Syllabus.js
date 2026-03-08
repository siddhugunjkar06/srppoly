const mongoose = require('mongoose');

const syllabusSchema = new mongoose.Schema({
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
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 6
  },
  type: {
    type: String,
    required: true,
    enum: ['MSBTE Curriculum', 'Lab Manual'],
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: { type: String, trim: true },
  pdfUrl:       { type: String, default: null },
  pdfPublicId:  { type: String, default: null },
  pdfName:      { type: String, default: null },
  isActive:     { type: Boolean, default: true },
  academicYear: { type: String, trim: true },   // e.g. "2023-24"
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now }
});

syllabusSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Syllabus', syllabusSchema);
