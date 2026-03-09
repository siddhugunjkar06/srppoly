const PDFDocument = require('pdfkit');
const path = require('path');
const fs   = require('fs');

// ─── Helpers ────────────────────────────────────────────────────────────────
function numberToWords(num) {
  if (!num || num === 0) return 'Zero';
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
                 'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
                 'Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function convert(n) {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' '+ones[n%10] : '');
    if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' '+convert(n%100) : '');
    if (n < 100000) return convert(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' '+convert(n%1000) : '');
    return convert(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' '+convert(n%100000) : '');
  }
  const rupees = Math.floor(num);
  const paise  = Math.round((num - rupees) * 100);
  let words = convert(rupees) + ' Rupees';
  if (paise > 0) words += ' and ' + convert(paise) + ' Paise';
  return words + ' Only';
}

// ════════════════════════════════════════════════════════════════════════════
//  CASH RECEIPT — matches Image 1 exactly
// ════════════════════════════════════════════════════════════════════════════
function generateFeeReceiptPDF(receipt, res) {
  const PAGE_W = 400;
  const PAGE_H = 680;
  const doc = new PDFDocument({
    size: [PAGE_W, PAGE_H],
    margin: 0
  });

  if (res) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="Receipt_${receipt.receiptNo || 'NEW'}_${receipt.studentName.replace(/\s+/g,'_')}.pdf"`);
    doc.pipe(res);
  }

  const ML = 18;  // margin left
  const MR = 18;  // margin right
  const CW = PAGE_W - ML - MR;  // content width

  // ── Outer border ─────────────────────────────────────────────────────────
  doc.rect(ML-4, 8, CW+8, PAGE_H-16).lineWidth(2).stroke('#4800ff');
  

  // ── DTE / MSBTE code boxes ────────────────────────────────────────────────
  doc.rect(ML, 14, 90, 18).lineWidth(1).stroke('#ff0000');
  doc.font('Helvetica-Bold').fontSize(8)
     .fillColor('#000').text('DTE CODE - 2631', ML+2, 18, { width: 86, align: 'center' });

  doc.rect(PAGE_W-MR-100, 14, 100, 18).lineWidth(1).stroke('#ff0000');
  doc.font('Helvetica-Bold').fontSize(8)
     .text('MSBTE CODE - 51305', PAGE_W-MR-98, 18, { width: 96, align: 'center' });

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#000')
     .text('P.G.V.M.Va S.M.Parbhani', ML+92, 19, { width: CW-192, align: 'center' });

  // ── College logo area (circle placeholder) ────────────────────────────────
  // Try to use actual logo if present
  const logoPath = path.join(__dirname, '../public/images/logo.png');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, ML+2, 36, { width: 44, height: 44, fit: [44,44] });
  } else {
    doc.circle(ML+24, 58, 20).lineWidth(1).stroke('#888');
  }

  // ── College name ──────────────────────────────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#ff2f2f')
     .text('SHRI RAMKRISHNA PARAMHANS', ML+50, 36, { width: CW-52, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#ff2f2f')
     .text('POLYTECHNIC INSTITUTE,', ML+50, 54, { width: CW-52, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#000')
     .text('At Hasnapur Tq.&Dist.Parbhani', ML+50, 72, { width: CW-52, align: 'center' });

  // ── Receipt No + CASH RECEIPT label + Date ────────────────────────────────
  const row1Y = 92;
  doc.font('Helvetica').fontSize(9).text(`Receipt No. ${receipt.receiptNo}`, ML, row1Y+2).fillColor('#1900ff');

  // CASH RECEIPT box
  const crX = ML + 130;
  doc.rect(crX, row1Y, 90, 16).fillAndStroke('#705dff','#ffffff');
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#fff')
     .text('CASH RECEIPT', crX+2, row1Y+3, { width: 86, align: 'center' });
  doc.fillColor('#000');

  // Date
  doc.font('Helvetica').fontSize(9)
     .text(`Date :   ${receipt.date || '   /   /202'}`, crX+150, row1Y+2);

  // ── Name of Student ───────────────────────────────────────────────────────
  const row2Y = 115;
  doc.font('Helvetica-Bold').fontSize(9).text('Name of Student : ', ML, row2Y);
  const nameVal = receipt.studentName || '';
  doc.font('Helvetica').fontSize(9).text(nameVal, ML+100, row2Y);
  doc.moveTo(ML+97, row2Y+11).lineTo(PAGE_W-MR, row2Y+11).lineWidth(.8).stroke('#000');

  // ── Class / Course / Enrollment ───────────────────────────────────────────
  const row3Y = 132;
  doc.font('Helvetica-Bold').fontSize(9).text('Class :  ', ML, row3Y);
  doc.font('Helvetica').fontSize(9).text(receipt.className || '', ML+36, row3Y);
  doc.moveTo(ML+33, row3Y+11).lineTo(ML+100, row3Y+11).lineWidth(.8).stroke('#000');

  doc.font('Helvetica-Bold').fontSize(9).text(`Course Name : ${receipt.course || ''}`, ML+105, row3Y);
  doc.font('Helvetica-Bold').fontSize(9).text('Enrollment No.:', ML+230, row3Y);
  doc.font('Helvetica').fontSize(9).text(receipt.enrollmentNo || '', ML+300, row3Y);
  doc.moveTo(ML+335, row3Y+11).lineTo(PAGE_W-MR, row3Y+11).lineWidth(.8).stroke('#000');

  // ── TABLE ─────────────────────────────────────────────────────────────────
  const TBL_TOP = 150;
  const COL_SR  = ML;
  const COL_SR_W = 42;
  const COL_DESC = ML + COL_SR_W;
  const COL_AMT_W = 68;
  const COL_AMT = PAGE_W - MR - COL_AMT_W;
  const COL_DESC_W = COL_AMT - COL_DESC;
  const ROW_H = 18;

  // Header
  doc.rect(COL_SR, TBL_TOP, CW, ROW_H).lineWidth(1).stroke('#000');
  doc.font('Helvetica-Bold').fontSize(9)
     .text('Sr.No.', COL_SR, TBL_TOP+4, { width: COL_SR_W, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(10)
     .text('DESCRIPTION / ITEM', COL_DESC, TBL_TOP+4, { width: COL_DESC_W, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(9)
     .text('Amount Rs', COL_AMT, TBL_TOP+4, { width: COL_AMT_W-2, align: 'center' });

  // Column separators in header
  doc.moveTo(COL_DESC, TBL_TOP).lineTo(COL_DESC, TBL_TOP+ROW_H).lineWidth(.8).stroke('#000');
  doc.moveTo(COL_AMT,  TBL_TOP).lineTo(COL_AMT,  TBL_TOP+ROW_H).lineWidth(.8).stroke('#000');

  // Fee rows
  const FEE_ITEMS = [
    { label: 'Tution Fees',                      key: 'tuitionFees' },
    { label: 'Development Fees',                  key: 'developmentFees' },
    { label: 'Admission Fees',                    key: 'admissionFees' },
    { label: 'Library deposit',                   key: 'libraryDeposit' },
    { label: 'Library Fees',                      key: 'libraryFees' },
    { label: 'Laboratory Fees',                   key: 'laboratoryFees' },
    { label: 'Gymkhana',                          key: 'gymkhana' },
    { label: "Student's Council",                 key: 'studentsCouncil' },
    { label: 'College Magazine',                  key: 'collegeMagazine' },
    { label: ' Identity Card & Insurance',        key: 'identityCardInsurance' },
    { label: 'Cultural Activities',               key: 'culturalActivities' },
    { label: "Student's Welfare",                 key: 'studentsWelfare' },
    { label: 'Eligibility Fees/Enrollment Fees',  key: 'eligibilityFees' },
    { label: 'MSBTE Exam/ University Fees',       key: 'msbteExamFees' },
    { label: 'Internet Fees',                     key: 'internetFees' },
    { label: 'Alumni Charges',                    key: 'alumniCharges' },
    { label: 'T.C. Fees',                         key: 'tcFees' },
    { label: 'Fine',                              key: 'fine' },
    { label: 'Bonafide Fees',                     key: 'bonafideFees' },
    { label: 'Other',                             key: 'other' },
    { label: '',                                  key: 'extra1' },
    { label: '',                                  key: 'extra2' },
  ];

  let runningTotal = 0;
  FEE_ITEMS.forEach((item, i) => {
    const y = TBL_TOP + ROW_H + i * ROW_H;
    const amt = receipt.fees ? (receipt.fees[item.key] || 0) : 0;
    if (amt > 0) runningTotal += amt;

    // Row border
    doc.rect(COL_SR, y, CW, ROW_H).lineWidth(.5).stroke('#000');

    // Sr.No
    doc.font('Helvetica').fontSize(8.5)
       .fillColor('#000').text(String(i+1), COL_SR, y+4, { width: COL_SR_W, align: 'center' });

    // Description
    doc.font('Helvetica').fontSize(8.5)
       .text(item.label, COL_DESC+4, y+4, { width: COL_DESC_W-8 });

    // Amount
    if (amt > 0) {
      doc.font('Helvetica').fontSize(8.5)
         .text(amt.toLocaleString('en-IN'), COL_AMT+2, y+4, { width: COL_AMT_W-6, align: 'right' });
    }

    // Column separators
    doc.moveTo(COL_DESC, y).lineTo(COL_DESC, y+ROW_H).lineWidth(.5).stroke('#000');
    doc.moveTo(COL_AMT,  y).lineTo(COL_AMT,  y+ROW_H).lineWidth(.5).stroke('#000');
  });

  // TOTAL row
  const totalY = TBL_TOP + ROW_H + FEE_ITEMS.length * ROW_H;
  const calcTotal = receipt.total || runningTotal;
  doc.rect(COL_SR, totalY, CW, ROW_H).lineWidth(1).stroke('#000');
  doc.moveTo(COL_DESC, totalY).lineTo(COL_DESC, totalY+ROW_H).lineWidth(.8).stroke('#000');
  doc.moveTo(COL_AMT,  totalY).lineTo(COL_AMT,  totalY+ROW_H).lineWidth(.8).stroke('#000');
  doc.font('Helvetica-Bold').fontSize(9)
     .text('Total ', COL_DESC, totalY+4, { width: COL_DESC_W, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(9)
     .text(calcTotal > 0 ? calcTotal.toLocaleString('en-IN') : '',
           COL_AMT+2, totalY+4, { width: COL_AMT_W-6, align: 'right' });

  // ── Rs in Words ───────────────────────────────────────────────────────────
  const wordsY = totalY + ROW_H + 10;
  const wordsText = receipt.amountInWords
    ? receipt.amountInWords
    : (calcTotal > 0 ? numberToWords(calcTotal) : '');
  doc.font('Helvetica').fontSize(8.5).fillColor('#000')
     .text('Rs in Words', ML, wordsY, { continued: true })
     .font('Helvetica').text('           ' + wordsText);
  doc.moveTo(ML+70, wordsY+12).lineTo(PAGE_W-MR, wordsY+12).lineWidth(.8).stroke('#000');

  // ── Signature line ────────────────────────────────────────────────────────
  const sigY = wordsY + 28;
  doc.moveTo(ML, sigY).lineTo(PAGE_W-MR, sigY).lineWidth(.8).stroke('#000');
  doc.font('Helvetica-Bold').fontSize(9)
     .text('Clerk', PAGE_W-MR-40, sigY+5);

  doc.end();
}


// ════════════════════════════════════════════════════════════════════════════
//  BONAFIDE CERTIFICATE — matches Image 2 exactly
// ════════════════════════════════════════════════════════════════════════════
function generateBonafidePDF(record, res) {
  const PAGE_W = 420;
  const PAGE_H = 620;

  const doc = new PDFDocument({ size: [PAGE_W, PAGE_H], margin: 0 });

  if (res) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="Bonafide_${record.serialNo || 'NEW'}_${record.studentName.replace(/\s+/g,'_')}.pdf"`);
    doc.pipe(res);
  }

  const ML = 24;
  const MR = 24;
  const CW = PAGE_W - ML - MR;

  // ── Logo ──────────────────────────────────────────────────────────────────
  const logoPath = path.join(__dirname, '../public/images/logo.png');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, ML, 16, { width: 56, height: 56 });
  } else {
    doc.circle(ML+28, 44, 26).lineWidth(1).stroke('#6b21a8');
  }

  // ── DTE CODE box (top right) ──────────────────────────────────────────────
  doc.rect(PAGE_W-MR-92, 14, 90, 18).lineWidth(1.5).stroke('#005eff');
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#000')
     .text('DTE CODE  2631', PAGE_W-MR-90, 18, { width: 86, align: 'center' });

  // ── P.G.V.M.Va S.M. ──────────────────────────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000')
     .text('P.G.V.M.Va S.M.', ML+58, 18, { width: CW-150, align: 'center' });

  // ── College name ──────────────────────────────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#ff0000')
     .text('Shri Ramkrishna Paramhans', ML+58, 32, { width: CW-90, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#ff0000')
     .text('Polytechnic Institute', ML+58, 50, { width: CW-90, align: 'center' });

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000')
     .text('At Hasnapur Tq.&Dist.Parbhani', ML, 70, { width: CW, align: 'center' });

  // ── Email & Website ───────────────────────────────────────────────────────
  doc.font('Helvetica').fontSize(8.5).fillColor('#000000')
     .text('srppoly007@gmail.com', ML, 84, { width: CW/2-10, align: 'right' });
  doc.font('Helvetica').fontSize(8.5).fillColor('#000000')
     .text('www.srppoly.org.in', ML+CW/2+10, 84, { width: CW/2-10 });

  // ── BONAFIDE CERTIFICATE box ──────────────────────────────────────────────
  const bcY = 100;
  doc.rect(ML+40, bcY, CW-80, 22).fillAndStroke('#d1d5db','#000');
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#000')
     .text('BONAFIDE CERTIFICATE', ML+42, bcY+5, { width: CW-84, align: 'center' });

  // ── Serial No. + Date ─────────────────────────────────────────────────────
  const refY = 132;
  const serialStr = record.serialNo
    ? `SRPPI/BONAFIDE /202${record.yearSuffix || ''}/ ${record.serialNo}`
    : 'SRPPI/BONAFIDE /202  /';
  doc.font('Helvetica').fontSize(9).fillColor('#000')
     .text(`No.: ${serialStr}`, ML, refY);
  doc.font('Helvetica').fontSize(9)
     .text(`Date :  ${record.date || '   /   /'}`, PAGE_W-MR-120, refY);

  // ── "This is Certify that" ────────────────────────────────────────────────
  const cert1Y = 175;
  doc.font('Helvetica-Oblique').fontSize(12).fillColor('#000')
     .text('This is Certify that  ', ML+20, cert1Y, { continued: true })
     .text(`  ${record.studentName || ''}`, { underline: false });
  doc.moveTo(ML+126, cert1Y+14).lineTo(PAGE_W-MR, cert1Y+14).lineWidth(.8).stroke('#000');

  // ── Divider line ──────────────────────────────────────────────────────────
  doc.moveTo(ML, cert1Y+26).lineTo(PAGE_W-MR, cert1Y+26).lineWidth(.8).stroke('#000');

  // ── Main certificate body ─────────────────────────────────────────────────
  const body1Y = cert1Y + 40;
  doc.font('Helvetica-Oblique').fontSize(12)
     .text('is  bonafide Student of this College Studying in diploma', ML, body1Y);

  const body2Y = body1Y + 28;
  doc.font('Helvetica-Oblique').fontSize(12)
     .text(`   ${record.yearOfStudy} year of Course`, ML, body2Y, { continued: true })
     .text(`                    ${record.course || ''}`, { underline: false });
  doc.moveTo(ML+154, body2Y+14).lineTo(PAGE_W-MR, body2Y+14).lineWidth(.8).stroke('#000');

  // ── Academic Year ─────────────────────────────────────────────────────────
  const body3Y = body2Y + 28;
  const ayFrom = record.academicYearFrom || '20';
  const ayTo   = record.academicYearTo   || '20';
  doc.font('Helvetica-Oblique').fontSize(12)
     .text(`Academic year 20${ayFrom.slice(-2)}`, ML, body3Y, { continued: true })
     .text(`  -20${ayTo.slice(-2)}`, { continued: false });

  // ── DOB ───────────────────────────────────────────────────────────────────
  const body4Y = body3Y + 28;
  const dob = record.dobDay && record.dobMonth && record.dobYear
    ? `${record.dobDay} / ${record.dobMonth} / ${record.dobYear}`
    : '   /   /  ';
  doc.font('Helvetica-Oblique').fontSize(12)
     .text(`        His / Her  Date  of  Birth `, ML, body4Y, { continued: true })
     .text(`    ${dob}`, { continued: true })
     .text('     as   per   our  ');

  // ── "our office records." ─────────────────────────────────────────────────
  const body5Y = body4Y + 28;
  doc.font('Helvetica-Oblique').fontSize(12)
     .text('  office  records.', ML, body5Y);

  // ── Issue Date at bottom ──────────────────────────────────────────────────
  const dateBottomY = body5Y + 80;
  doc.font('Helvetica').fontSize(10)
     .text(`Date :   ${record.issueDate || '   /   /'}`, ML, dateBottomY);

  // ── Signatures ────────────────────────────────────────────────────────────
  const sigY = PAGE_H - 60;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#000')
     .text('Clerk', ML+10, sigY);
  doc.font('Helvetica-Bold').fontSize(11)
     .text('Principal', PAGE_W-MR-70, sigY);

  doc.end();
}

module.exports = { generateFeeReceiptPDF, generateBonafidePDF, numberToWords };
