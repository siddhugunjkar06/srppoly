const express    = require('express');
const router     = express.Router();
const https      = require('https');
const http       = require('http');
const Enquiry    = require('../models/Enquiry');
const Contact    = require('../models/Contact');
const Notice     = require('../models/Notice');
const Faculty    = require('../models/Faculty');
const Gallery    = require('../models/Gallery');
const Grievance  = require('../models/Grievance');
const Syllabus   = require('../models/Syllabus');
const LabManual  = require('../models/LabManual');

const DEPT_CONFIG = {
  'electrical-engineering': {
    name: 'Electrical Engineering', icon: '⚡', seats: 60,
    color: 'linear-gradient(135deg,#1a3a6b,#0a1628)',
    accentColor: '#93c5fd',
    description: 'Master power systems, control technology, and electrical installations. High demand across industries.',
    subjects: 'Power Electronics, PLC & Automation, Electrical Machines, Circuit Theory, Control Systems, Power Systems'
  },
  'computer-engineering': {
    name: 'Computer Engineering', icon: '💻', seats: 60,
    color: 'linear-gradient(135deg,#1a5c1a,#0d3b0d)',
    accentColor: '#86efac',
    description: 'Build software, networks, and systems. The most sought-after diploma program in today\'s digital world.',
    subjects: 'Web Development, Database Management, Java Programming, Computer Networks, Operating Systems, Software Engineering'
  },
  'ai-machine-learning': {
    name: 'AI & Machine Learning', icon: '🤖', seats: 60,
    color: 'linear-gradient(135deg,#5c1a5c,#3b0d3b)',
    accentColor: '#d8b4fe',
    description: 'Step into the future. Learn Python, neural networks, and data science in our cutting-edge AI program.',
    subjects: 'Python Programming, Machine Learning, Deep Learning, Data Analytics, IoT, Computer Vision'
  },
  'electronics-communication': {
    name: 'Electronics & Communication', icon: '📡', seats: 30,
    color: 'linear-gradient(135deg,#5c3a1a,#3b1f0d)',
    accentColor: '#fdba74',
    description: 'Design circuits, communication systems, and embedded technology powering the connected world.',
    subjects: 'Microprocessors, VLSI Design, Telecom Systems, Embedded Systems, Digital Electronics, Signal Processing'
  }
};

// ── HOME PAGE ──────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [notices, faculty, gallery] = await Promise.all([
      Notice.find().sort({ publishedAt: -1 }).limit(6).lean(),
      Faculty.find().sort({ isHOD: -1, order: 1, createdAt: 1 }).lean(),
      Gallery.find().sort({ isFeatured: -1, order: 1, createdAt: -1 }).limit(12).lean()
    ]);

    res.render('index', {
      title: 'SRPP Polytechnic Institute — Excellence in Technical Education',
      notices,
      faculty,
      gallery,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (err) {
    console.error(err);
    res.render('index', { title: 'SRPP Polytechnic Institute', notices: [], faculty: [], gallery: [], success: [], error: [] });
  }
});

// ── ADMISSION ENQUIRY ──────────────────────────────────────────────────────
router.post('/enquiry', async (req, res) => {
  try {
    const { fname, lname, email, phone, dept, marks, category, message } = req.body;

    if (!fname || !email || !phone || !dept) {
      req.flash('error', 'Please fill in all required fields.');
      return res.redirect('/#admission');
    }

    await Enquiry.create({
      firstName: fname, lastName: lname,
      email, phone,
      department: dept, marks, category, message
    });

    req.flash('success', `Thank you ${fname}! Our admissions team will contact you within 24 hours.`);
    res.redirect('/#admission');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong. Please try again.');
    res.redirect('/#admission');
  }
});

// ── CONTACT FORM ───────────────────────────────────────────────────────────
router.post('/contact', async (req, res) => {
  try {
    const { c_name, c_email, c_phone, c_subject, c_message } = req.body;

    if (!c_name || !c_email || !c_message) {
      req.flash('error', 'Please fill in all required fields.');
      return res.redirect('/#contact');
    }

    await Contact.create({
      name: c_name, email: c_email,
      phone: c_phone, subject: c_subject, message: c_message
    });

    req.flash('success', `Message received! We'll respond to ${c_email} shortly.`);
    res.redirect('/#contact');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong. Please try again.');
    res.redirect('/#contact');
  }
});

// ── NOTICES PAGE ───────────────────────────────────────────────────────────
router.get('/notices', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category && category !== 'All' ? { category } : {};
    const notices = await Notice.find(filter).sort({ publishedAt: -1 }).lean();
    res.render('notices', { title: 'Notices & Announcements — SRPP', notices, activeCategory: category || 'All' });
  } catch (err) {
    res.render('notices', { title: 'Notices', notices: [], activeCategory: 'All' });
  }
});

// ── GRIEVANCES PUBLIC PAGE ─────────────────────────────────────────────────
router.get('/grievances', async (req, res) => {
  try {
    const grievances = await Grievance.find({ isActive: true }).sort({ srNo: 1 }).lean();
    res.render('grievances', { title: 'Grievances & Committees — SRPP', grievances });
  } catch (err) {
    res.render('grievances', { title: 'Grievances — SRPP', grievances: [] });
  }
});

// ── PUBLIC DEPARTMENT PAGE ─────────────────────────────────────────────────
router.get('/departments/:slug', async (req, res) => {
  try {
    const cfg = DEPT_CONFIG[req.params.slug];
    if (!cfg) return res.redirect('/#departments');

    const [syllabus, faculty, labManuals] = await Promise.all([
      Syllabus.find({ department: cfg.name, isActive: true }).sort({ semester: 1, type: 1 }).lean(),
      Faculty.find({ department: cfg.name }).sort({ isHOD: -1, order: 1 }).lean(),
      LabManual.find({ department: cfg.name, isActive: true }, { semester: 1 }).lean()
    ]);

    // Group syllabus by semester
    const bySemester = {};
    for (let s = 1; s <= 6; s++) bySemester[s] = {};
    syllabus.forEach(doc => {
      if (!bySemester[doc.semester]) bySemester[doc.semester] = {};
      bySemester[doc.semester][doc.type] = doc;
    });

    // Count lab manuals per semester
    const labManualCounts = {};
    for (let s = 1; s <= 6; s++) labManualCounts[s] = 0;
    labManuals.forEach(m => { if (labManualCounts[m.semester] !== undefined) labManualCounts[m.semester]++; });

    res.render('department', {
      title: `${cfg.name} — SRPP Polytechnic`,
      cfg, slug: req.params.slug, bySemester, faculty,
      labManualCounts,
      semesters: [1,2,3,4,5,6],
      DEPT_CONFIG,
      allSlugs: Object.keys(DEPT_CONFIG)
    });
  } catch (err) {
    console.error(err);
    res.redirect('/#departments');
  }
});

// ── PUBLIC LAB MANUAL DETAIL PAGE (per dept + semester) ───────────────────
router.get('/departments/:slug/lab-manuals/:sem', async (req, res) => {
  try {
    const cfg = DEPT_CONFIG[req.params.slug];
    if (!cfg) return res.redirect('/#departments');
    const semester = parseInt(req.params.sem);
    if (!semester || semester < 1 || semester > 6) return res.redirect(`/departments/${req.params.slug}`);

    const yearLabel = semester <= 2 ? '1st Year' : semester <= 4 ? '2nd Year' : '3rd Year';

    const [manuals, allCounts] = await Promise.all([
      LabManual.find({ department: cfg.name, semester, isActive: true })
               .sort({ order: 1, subjectName: 1 }).lean(),
      LabManual.find({ department: cfg.name, isActive: true }, { semester: 1 }).lean()
    ]);

    // Count per semester for nav
    const labBySem = {};
    for (let s = 1; s <= 6; s++) labBySem[s] = 0;
    allCounts.forEach(m => { if (labBySem[m.semester] !== undefined) labBySem[m.semester]++; });

    res.render('lab-manual-detail', {
      title: `Sem ${semester} Lab Manuals — ${cfg.name} — SRPP`,
      cfg, slug: req.params.slug, semester, yearLabel,
      manuals, labBySem
    });
  } catch (err) {
    console.error(err);
    res.redirect(`/departments/${req.params.slug}`);
  }
});

// ── PDF PROXY DOWNLOAD ─────────────────────────────────────────────────────
// Streams Cloudinary raw PDF through our server so the browser always gets
// Content-Disposition: attachment (forces Save dialog, not browser preview).
// pdfUrl stored in DB is result.secure_url from upload_stream — always valid.

function streamPDF(pdfUrl, pdfName, res, hops) {
  if ((hops || 0) > 5) return res.status(500).send('Too many redirects.');

  let filename = (pdfName || 'document').replace(/[^a-zA-Z0-9_.\- ]/g, '_');
  if (!filename.toLowerCase().endsWith('.pdf')) filename += '.pdf';

  const lib = pdfUrl.startsWith('https') ? https : http;

  lib.get(pdfUrl, (upstream) => {
    // Follow redirects
    if ([301, 302, 307, 308].includes(upstream.statusCode)) {
      upstream.resume();
      return streamPDF(upstream.headers.location, filename, res, (hops || 0) + 1);
    }
    if (upstream.statusCode !== 200) {
      console.error('[streamPDF] status', upstream.statusCode, pdfUrl);
      return res.status(502).send('Could not fetch PDF from storage (' + upstream.statusCode + '). Please re-upload.');
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    if (upstream.headers['content-length']) res.setHeader('Content-Length', upstream.headers['content-length']);
    upstream.pipe(res);
    upstream.on('error', () => { if (!res.headersSent) res.status(500).send('Stream error.'); });
  }).on('error', (err) => {
    console.error('[streamPDF] error', err.message, pdfUrl);
    if (!res.headersSent) res.status(500).send('Download failed.');
  });
}

router.get('/download/lab-manual/:id', async (req, res) => {
  try {
    const doc = await LabManual.findById(req.params.id).lean();
    if (!doc)          return res.status(404).send('Lab manual not found.');
    if (!doc.pdfUrl)   return res.status(404).send('No PDF uploaded yet. Please upload via Admin → Lab Manuals → Edit.');
    streamPDF(doc.pdfUrl, doc.pdfName || doc.subjectName + '_Lab_Manual', res);
  } catch (err) {
    console.error(err);
    res.status(500).send('Download error.');
  }
});

router.get('/download/syllabus/:id', async (req, res) => {
  try {
    const doc = await Syllabus.findById(req.params.id).lean();
    if (!doc)          return res.status(404).send('Syllabus not found.');
    if (!doc.pdfUrl)   return res.status(404).send('No PDF uploaded yet. Please upload via Admin → Syllabus → Edit.');
    streamPDF(doc.pdfUrl, doc.pdfName || doc.department + '_Sem' + doc.semester, res);
  } catch (err) {
    console.error(err);
    res.status(500).send('Download error.');
  }
});

router.get('/download/grievance/:id', async (req, res) => {
  try {
    const doc = await Grievance.findById(req.params.id).lean();
    if (!doc)          return res.status(404).send('Grievance not found.');
    if (!doc.pdfUrl)   return res.status(404).send('No PDF uploaded yet. Please upload via Admin → Grievances → Edit.');
    streamPDF(doc.pdfUrl, doc.pdfName || doc.name, res);
  } catch (err) {
    console.error(err);
    res.status(500).send('Download error.');
  }
});

module.exports = router;
