const mongoose = require('mongoose');

const alumniSchema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true },
  department: {
    type: String, required: true,
    enum: ['Electrical Engineering','Computer Engineering','AI & Machine Learning','Electronics & Communication']
  },
  enrollmentNo:   { type: String, trim: true, default: '' },
  passOutYear:    { type: Number, required: true },           // e.g. 2023
  imageUrl:       { type: String, default: null },
  imagePublicId:  { type: String, default: null },

  // Current status — job or higher education
  statusType:     { type: String, enum: ['job','higher_education','other'], default: 'job' },
  companyName:    { type: String, trim: true, default: '' },  // if job
  jobRole:        { type: String, trim: true, default: '' },  // if job
  collegeName:    { type: String, trim: true, default: '' },  // if higher education
  courseName:     { type: String, trim: true, default: '' },  // if higher education
  otherStatus:    { type: String, trim: true, default: '' },  // if other

  message:        { type: String, trim: true, default: '' },  // short quote / testimonial
  isFeatured:     { type: Boolean, default: true },
  order:          { type: Number, default: 0 },
  createdAt:      { type: Date, default: Date.now },
  updatedAt:      { type: Date, default: Date.now }
});

alumniSchema.pre('save', function(next) { this.updatedAt = Date.now(); next(); });

module.exports = mongoose.model('Alumni', alumniSchema);
