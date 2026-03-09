const mongoose = require('mongoose');

const subjectSyllabusSchema = new mongoose.Schema({
  department: {
    type: String, required: true,
    enum: ['Electrical Engineering','Computer Engineering','AI & Machine Learning','Electronics & Communication']
  },
  semester:     { type: Number, required: true, min: 1, max: 6 },
  subjectCode:  { type: String, trim: true, default: '' },   // e.g. 22318
  subjectName:  { type: String, required: true, trim: true },
  description:  { type: String, trim: true, default: '' },
  pdfUrl:       { type: String, default: null },
  pdfPublicId:  { type: String, default: null },
  pdfName:      { type: String, default: null },
  academicYear: { type: String, trim: true, default: '' },
  isActive:     { type: Boolean, default: true },
  order:        { type: Number, default: 0 },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now }
});

subjectSyllabusSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('SubjectSyllabus', subjectSyllabusSchema);
