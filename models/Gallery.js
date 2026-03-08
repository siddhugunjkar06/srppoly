const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  category: {
    type: String,
    required: true,
    enum: ['Campus', 'Labs', 'Events', 'Sports', 'Achievements', 'Cultural'],
    default: 'Campus'
  },
  imageUrl:      { type: String, required: true },
  imagePublicId: { type: String, required: true },
  isFeatured:    { type: Boolean, default: false },
  order:         { type: Number, default: 0 },
  takenAt:       { type: Date },
  createdAt:     { type: Date, default: Date.now }
});

module.exports = mongoose.model('Gallery', gallerySchema);
