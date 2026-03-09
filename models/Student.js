const mongoose = require('mongoose');

// ── FEE RECEIPT ────────────────────────────────────────────────────────────
const feeReceiptSchema = new mongoose.Schema({
  receiptNo:    { type: Number },                      // auto-incremented
  date:         { type: String, required: true },      // DD/MM/YYYY
  studentName:  { type: String, required: true, trim: true },
  className:    { type: String, trim: true },
  course:       { type: String, enum: ['CO','EE','AN','ET',''], default: '' },
  enrollmentNo: { type: String, trim: true },
  fees: {
    tuitionFees:        { type: Number, default: 0 },
    developmentFees:    { type: Number, default: 0 },
    admissionFees:      { type: Number, default: 0 },
    libraryDeposit:     { type: Number, default: 0 },
    libraryFees:        { type: Number, default: 0 },
    laboratoryFees:     { type: Number, default: 0 },
    gymkhana:           { type: Number, default: 0 },
    studentsCouncil:    { type: Number, default: 0 },
    collegeMagazine:    { type: Number, default: 0 },
    identityCardInsurance: { type: Number, default: 0 },
    culturalActivities: { type: Number, default: 0 },
    studentsWelfare:    { type: Number, default: 0 },
    eligibilityFees:    { type: Number, default: 0 },
    msbteExamFees:      { type: Number, default: 0 },
    internetFees:       { type: Number, default: 0 },
    alumniCharges:      { type: Number, default: 0 },
    tcFees:             { type: Number, default: 0 },
    fine:               { type: Number, default: 0 },
    bonafideFees:       { type: Number, default: 0 },
    other:              { type: Number, default: 0 },
    extra1:             { type: Number, default: 0 },
    extra2:             { type: Number, default: 0 },
  },
  total:        { type: Number, default: 0 },
  amountInWords: { type: String, trim: true },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now }
});

feeReceiptSchema.pre('save', function(next) { this.updatedAt = Date.now(); next(); });

// ── BONAFIDE CERTIFICATE ───────────────────────────────────────────────────
const bonafideSchema = new mongoose.Schema({
  serialNo:     { type: Number },                      // auto-incremented → SRPPI/BONAFIDE/202X/N
  yearSuffix:   { type: String, default: '' },         // e.g. "5" for 2025
  date:         { type: String, required: true },      // DD/MM/YYYY
  studentName:  { type: String, required: true, trim: true },
  yearOfStudy:  { type: String, enum: ['I','II','III'], required: true },
  course:       { type: String, trim: true },          // full course name
  academicYearFrom: { type: String, trim: true },      // e.g. "2024"
  academicYearTo:   { type: String, trim: true },      // e.g. "2025"
  dobDay:       { type: String, default: '' },
  dobMonth:     { type: String, default: '' },
  dobYear:      { type: String, default: '' },
  issueDate:    { type: String, default: '' },         // date at bottom
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now }
});

bonafideSchema.pre('save', function(next) { this.updatedAt = Date.now(); next(); });

const FeeReceipt = mongoose.model('FeeReceipt', feeReceiptSchema);
const Bonafide   = mongoose.model('Bonafide',   bonafideSchema);

module.exports = { FeeReceipt, Bonafide };
