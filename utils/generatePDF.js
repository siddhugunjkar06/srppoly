const PDFDocument = require('pdfkit');

// ── Colours ────────────────────────────────────────────────────────────────
const NAVY   = '#0a1628';
const BLUE   = '#1a3a6b';
const GOLD   = '#d4a843';
const GRAY   = '#475569';
const WHITE  = '#ffffff';
const LIGHT  = '#f8fafc';

// ─────────────────────────────────────────────────────────────────────────────
//  generateAdmissionReceipt
//  Creates a PDF with clickable anchor links and streams it to `res`
//
//  Usage in a route:
//    const { generateAdmissionReceipt } = require('../utils/generatePDF');
//    router.get('/receipt/:id', requireAuth, async (req, res) => {
//      const enquiry = await Enquiry.findById(req.params.id).lean();
//      generateAdmissionReceipt(enquiry, res);
//    });
// ─────────────────────────────────────────────────────────────────────────────
function generateAdmissionReceipt(enquiry, res) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // ── Stream PDF directly to browser ──────────────────────────────────────
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="SRPP_Receipt_${enquiry._id}.pdf"`);
  doc.pipe(res);

  // ── Header bar ──────────────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 90).fill(NAVY);

  doc
    .fillColor(GOLD)
    .font('Helvetica-Bold')
    .fontSize(22)
    .text('SRPP Polytechnic Institute', 50, 22);

  doc
    .fillColor(WHITE)
    .font('Helvetica')
    .fontSize(10)
    .text('Parbhani, Maharashtra  |  MSBTE Affiliated  |  AICTE Approved', 50, 50);

  // ── Gold divider line ────────────────────────────────────────────────────
  doc.rect(0, 90, doc.page.width, 4).fill(GOLD);

  // ── Title ────────────────────────────────────────────────────────────────
  doc.moveDown(2);
  doc
    .fillColor(NAVY)
    .font('Helvetica-Bold')
    .fontSize(16)
    .text('Admission Enquiry Receipt', { align: 'center' });

  doc
    .fillColor(GRAY)
    .font('Helvetica')
    .fontSize(9)
    .text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, { align: 'center' });

  doc.moveDown(1.5);

  // ── Details table ────────────────────────────────────────────────────────
  const tableTop = doc.y;
  const col1 = 50;
  const col2 = 220;
  const rowH  = 28;

  const rows = [
    ['Student Name',  `${enquiry.firstName || ''} ${enquiry.lastName || ''}`.trim()],
    ['Email',         enquiry.email    || '—'],
    ['Phone',         enquiry.phone    || '—'],
    ['Department',    enquiry.department || '—'],
    ['Course',        'Diploma Engineering (3 Years)'],
    ['Academic Year', '2024-25'],
    ['Status',        enquiry.status   || 'New'],
    ['Reference No.', enquiry._id?.toString().slice(-8).toUpperCase() || '—'],
  ];

  rows.forEach(([label, value], i) => {
    const y = tableTop + i * rowH;
    const bg = i % 2 === 0 ? '#f8fafc' : WHITE;

    // row background
    doc.rect(col1 - 8, y - 6, doc.page.width - 84, rowH).fill(bg);

    // label
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10)
       .text(label, col1, y, { width: 160 });

    // value — special handling for email (clickable anchor link)
    if (label === 'Email' && enquiry.email) {
      // ── ANCHOR LINK — mailto: ──────────────────────────────────────────
      doc
        .fillColor('#1a56db')
        .font('Helvetica')
        .fontSize(10)
        .text(enquiry.email, col2, y, {
          link: `mailto:${enquiry.email}`,   // ← clickable mailto anchor
          underline: true,
        });
    } else {
      doc.fillColor(GRAY).font('Helvetica').fontSize(10)
         .text(value, col2, y, { width: 280 });
    }
  });

  doc.moveDown(3);

  // ── Section: Important Links with anchor tags ────────────────────────────
  doc
    .fillColor(NAVY)
    .font('Helvetica-Bold')
    .fontSize(12)
    .text('Important Links', 50);

  doc.moveDown(0.4);

  // Light background box
  const linksY = doc.y;
  doc.rect(42, linksY - 6, doc.page.width - 84, 120).fill('#f0f4ff');

  const links = [
    { label: 'College Website',          url: 'https://srpp-college.onrender.com' },
    { label: 'Admission Portal',         url: 'https://srpp-college.onrender.com/#admission' },
    { label: 'Department Information',   url: 'https://srpp-college.onrender.com/#departments' },
    { label: 'Contact Us',               url: 'https://srpp-college.onrender.com/#contact' },
    { label: 'MSBTE Official Website',   url: 'https://msbte.org.in' },
  ];

  links.forEach((item, i) => {
    const y = linksY + i * 22;

    // Bullet dot
    doc.fillColor(GOLD).circle(58, y + 5, 3).fill();

    // Label text (normal)
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10)
       .text(`${item.label}: `, 68, y, { continued: true });

    // ── ANCHOR LINK — https:// URL ─────────────────────────────────────
    doc
      .fillColor('#1a56db')
      .font('Helvetica')
      .fontSize(10)
      .text(item.url, {
        link: item.url,       // ← this makes the text a clickable link in the PDF
        underline: true,
        continued: false,
      });
  });

  doc.moveDown(2.5);

  // ── Note box ─────────────────────────────────────────────────────────────
  doc
    .rect(42, doc.y, doc.page.width - 84, 60)
    .fillAndStroke('#fffbeb', '#d97706');

  doc
    .fillColor('#92400e')
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('Note:', 58, doc.y - 52);

  doc
    .fillColor('#78350f')
    .font('Helvetica')
    .fontSize(9)
    .text(
      'This is an auto-generated enquiry receipt. Admission is subject to seat availability and document verification. ' +
      'Please visit the college or contact us for further details.',
      58, doc.y - 38, { width: doc.page.width - 120 }
    );

  // ── Footer ────────────────────────────────────────────────────────────────
  const footerY = doc.page.height - 60;
  doc.rect(0, footerY, doc.page.width, 60).fill(NAVY);

  doc
    .fillColor(GOLD)
    .font('Helvetica-Bold')
    .fontSize(9)
    .text('SRPP Polytechnic Institute', 50, footerY + 12);

  doc
    .fillColor(WHITE)
    .font('Helvetica')
    .fontSize(8)
    .text('Parbhani, Maharashtra', 50, footerY + 26);

  // ── ANCHOR LINK in footer — website URL ───────────────────────────────
  doc
    .fillColor(GOLD)
    .font('Helvetica')
    .fontSize(8)
    .text('srpp-college.onrender.com', 50, footerY + 38, {
      link: 'https://srpp-college.onrender.com',   // ← clickable in footer too
      underline: true,
    });

  doc
    .fillColor(WHITE)
    .font('Helvetica')
    .fontSize(8)
    .text(`Receipt ID: ${enquiry._id?.toString().slice(-8).toUpperCase()}`, { align: 'right' }, footerY + 22);

  doc.end();
}

// ─────────────────────────────────────────────────────────────────────────────
//  generateCertificate
//  Generic certificate PDF with a clickable verification link
// ─────────────────────────────────────────────────────────────────────────────
function generateCertificate({ studentName, courseName, date, verifyUrl }, res) {
  const doc = new PDFDocument({ margin: 60, size: 'A4', layout: 'landscape' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="SRPP_Certificate.pdf"`);
  doc.pipe(res);

  // Border
  doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
     .lineWidth(3).strokeColor(GOLD).stroke();
  doc.rect(28, 28, doc.page.width - 56, doc.page.height - 56)
     .lineWidth(1).strokeColor(NAVY).stroke();

  // Title
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(32)
     .text('Certificate of Completion', { align: 'center' });

  doc.moveDown(0.5);
  doc.fillColor(GRAY).font('Helvetica').fontSize(14)
     .text('This is to certify that', { align: 'center' });

  doc.moveDown(0.5);
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(26)
     .text(studentName, { align: 'center', underline: true });

  doc.moveDown(0.5);
  doc.fillColor(GRAY).font('Helvetica').fontSize(14)
     .text(`has successfully completed the course`, { align: 'center' });

  doc.moveDown(0.3);
  doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(18)
     .text(courseName, { align: 'center' });

  doc.moveDown(0.5);
  doc.fillColor(GRAY).font('Helvetica').fontSize(12)
     .text(`Date: ${date}`, { align: 'center' });

  doc.moveDown(0.5);
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(14)
     .text('SRPP Polytechnic Institute, Parbhani', { align: 'center' });

  // ── Verify link anchor ───────────────────────────────────────────────────
  if (verifyUrl) {
    doc.moveDown(1);
    doc.fillColor(GRAY).font('Helvetica').fontSize(10)
       .text('Verify this certificate: ', { continued: true });
    doc
      .fillColor('#1a56db')
      .font('Helvetica')
      .fontSize(10)
      .text(verifyUrl, {
        link: verifyUrl,      // ← clickable verification link
        underline: true,
      });
  }

  doc.end();
}

module.exports = { generateAdmissionReceipt, generateCertificate };
