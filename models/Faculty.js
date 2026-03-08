const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  designation:   { type: String, required: true, trim: true },
  department:    {
    type: String,
    required: true,
    enum: ['Electrical Engineering', 'Computer Engineering', 'AI & Machine Learning', 'Electronics & Communication', 'Science & Humanities']
  },
  qualification: { type: String, required: true, trim: true },
  experience:    { type: String, trim: true },
  specialization:{ type: String, trim: true },
  email:         { type: String, trim: true, lowercase: true },
  phone:         { type: String, trim: true },
  imageUrl:      { type: String, default: null },
  imagePublicId: { type: String, default: null },
  isHOD:         { type: Boolean, default: false },
  order:         { type: Number, default: 0 },
  createdAt:     { type: Date, default: Date.now }
});

module.exports = mongoose.model('Faculty', facultySchema);
