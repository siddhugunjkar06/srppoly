const express    = require('express');
const router     = express.Router();
const Admin      = require('../models/Admin');
const Enquiry    = require('../models/Enquiry');
const Contact    = require('../models/Contact');
const Notice     = require('../models/Notice');
const Faculty    = require('../models/Faculty');
const Gallery    = require('../models/Gallery');
const Grievance  = require('../models/Grievance');
const Syllabus   = require('../models/Syllabus');
const LabManual        = require('../models/LabManual');
const SubjectSyllabus  = require('../models/SubjectSyllabus');
const { generateAdmissionReceipt } = require('../utils/generatePDF');
const { generateFeeReceiptPDF, generateBonafidePDF, numberToWords } = require('../utils/managementPDF');
const { FeeReceipt, Bonafide } = require('../models/Student');
const Alumni = require('../models/Alumni');
const { cloudinary, uploadFaculty, uploadAlumni, uploadGallery, uploadGrievancePDF, uploadSyllabusPDF, uploadSubjectSyllabusPDF, uploadLabManualPDF, destroyPDF } = require('../config/cloudinary');

// ── Auth Middleware ────────────────────────────────────────────────────────
const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes in ms

const requireAuth = (req, res, next) => {
  if (!req.session.adminId) {
    req.flash('error', 'Please log in to access the admin panel.');
    return res.redirect('/admin/login');
  }
  // Check inactivity
  const now = Date.now();
  if (req.session.lastActive && (now - req.session.lastActive) > INACTIVITY_LIMIT) {
    req.session.destroy();
    req.flash('error', 'Session expired due to inactivity. Please log in again.');
    return res.redirect('/admin/login');
  }
  // Refresh last active timestamp on every request
  req.session.lastActive = now;
  next();
};

// ── LOGIN ──────────────────────────────────────────────────────────────────
router.get('/login', (req, res) => {
  if (req.session.adminId) return res.redirect('/admin/dashboard');
  res.render('admin/login', { title: 'Admin Login — SRPP' });
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });

    if (!admin || !(await admin.comparePassword(password))) {
      req.flash('error', 'Invalid username or password.');
      return res.redirect('/admin/login');
    }

    req.session.adminId = admin._id;
    req.session.adminName = admin.name;
    req.session.lastActive = Date.now();
    req.flash('success', `Welcome back, ${admin.name}!`);
    res.redirect('/admin/dashboard');
  } catch (err) {
    req.flash('error', 'Login failed. Please try again.');
    res.redirect('/admin/login');
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// ── SESSION PING (keep-alive from client) ─────────────────────────────────
router.post('/ping', requireAuth, (req, res) => {
  req.session.lastActive = Date.now();
  res.json({ ok: true });
});



// ── SIGNUP ─────────────────────────────────────────────────────────────────
router.get('/signup', (req, res) => {
  if (req.session.adminId) return res.redirect('/admin/dashboard');
  res.render('admin/signup', { title: 'Create Admin Account — SRPP' });
});

router.post('/signup', async (req, res) => {
  try {
    const { name, email, username, password, confirmPassword, invite } = req.body;

    // Basic invite code check — change this to your own secret
    if (invite !== process.env.ADMIN_INVITE_CODE) {
      req.flash('error', 'Invalid invite code.');
      return res.redirect('/admin/signup');
    }
    if (password !== confirmPassword) {
      req.flash('error', 'Passwords do not match.');
      return res.redirect('/admin/signup');
    }
    if (password.length < 6) {
      req.flash('error', 'Password must be at least 6 characters.');
      return res.redirect('/admin/signup');
    }

    const existingUser  = await Admin.findOne({ username: username.toLowerCase() });
    const existingEmail = await Admin.findOne({ email: email.toLowerCase() });
    if (existingUser)  { req.flash('error', 'Username already taken.');    return res.redirect('/admin/signup'); }
    if (existingEmail) { req.flash('error', 'Email already registered.');  return res.redirect('/admin/signup'); }

    await Admin.create({ name, email: email.toLowerCase(), username: username.toLowerCase(), password });
    req.flash('success', `Account created! You can now log in, ${name}.`);
    res.redirect('/admin/login');
  } catch (err) {
    req.flash('error', 'Signup failed. Please try again.');
    res.redirect('/admin/signup');
  }
});

// ── CHANGE PASSWORD ────────────────────────────────────────────────────────
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const admin = await Admin.findById(req.session.adminId);
    if (!admin) { req.flash('error', 'Session expired.'); return res.redirect('/admin/login'); }

    if (!(await admin.comparePassword(currentPassword))) {
      req.flash('error', 'Current password is incorrect.');
      return res.redirect('/admin/dashboard');
    }
    if (newPassword !== confirmNewPassword) {
      req.flash('error', 'New passwords do not match.');
      return res.redirect('/admin/dashboard');
    }
    if (newPassword.length < 6) {
      req.flash('error', 'New password must be at least 6 characters.');
      return res.redirect('/admin/dashboard');
    }

    admin.password = newPassword;
    await admin.save(); // pre-save hook re-hashes
    req.flash('success', 'Password changed successfully!');
    res.redirect('/admin/dashboard');
  } catch (err) {
    req.flash('error', 'Failed to change password.');
    res.redirect('/admin/dashboard');
  }
});



// ── DASHBOARD ─────────────────────────────────────────────────────────────
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const [totalEnquiries, newEnquiries, totalContacts, unreadContacts, totalNotices, totalFaculty, totalGallery, totalGrievances, totalSyllabus] = await Promise.all([
      Enquiry.countDocuments(),
      Enquiry.countDocuments({ status: 'New' }),
      Contact.countDocuments(),
      Contact.countDocuments({ read: false }),
      Notice.countDocuments(),
      Faculty.countDocuments(),
      Gallery.countDocuments(),
      Grievance.countDocuments(),
      Syllabus.countDocuments()
    ]);

    const recentEnquiries = await Enquiry.find().sort({ createdAt: -1 }).limit(5).lean();
    const recentContacts  = await Contact.find().sort({ createdAt: -1 }).limit(5).lean();

    res.render('admin/dashboard', {
      title: 'Admin Dashboard — SRPP',
      adminName: req.session.adminName,
      stats: { totalEnquiries, newEnquiries, totalContacts, unreadContacts, totalNotices, totalFaculty, totalGallery, totalGrievances, totalSyllabus },
      recentEnquiries,
      recentContacts
    });
  } catch (err) {
    res.render('admin/dashboard', { title: 'Dashboard', adminName: req.session.adminName, stats: {}, recentEnquiries: [], recentContacts: [] });
  }
});

// ── ENQUIRIES ─────────────────────────────────────────────────────────────
router.get('/enquiries', requireAuth, async (req, res) => {
  const enquiries = await Enquiry.find().sort({ createdAt: -1 }).lean();
  res.render('admin/enquiries', { title: 'Enquiries — Admin', enquiries, adminName: req.session.adminName });
});


// ── ENQUIRY RECEIPT PDF ────────────────────────────────────────────────────
router.get('/enquiries/:id/receipt', requireAuth, async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id).lean();
    if (!enquiry) return res.status(404).send('Enquiry not found.');
    generateAdmissionReceipt(enquiry, res);
  } catch (err) {
    res.status(500).send('Failed to generate receipt.');
  }
});

router.post('/enquiries/:id/status', requireAuth, async (req, res) => {
  await Enquiry.findByIdAndUpdate(req.params.id, { status: req.body.status });
  req.flash('success', 'Status updated.');
  res.redirect('/admin/enquiries');
});

router.delete('/enquiries/:id', requireAuth, async (req, res) => {
  await Enquiry.findByIdAndDelete(req.params.id);
  req.flash('success', 'Enquiry deleted.');
  res.redirect('/admin/enquiries');
});

// ── CONTACTS ──────────────────────────────────────────────────────────────
router.get('/contacts', requireAuth, async (req, res) => {
  const contacts = await Contact.find().sort({ createdAt: -1 }).lean();
  // Mark all as read
  await Contact.updateMany({ read: false }, { read: true });
  res.render('admin/contacts', { title: 'Contact Messages — Admin', contacts, adminName: req.session.adminName });
});

router.delete('/contacts/:id', requireAuth, async (req, res) => {
  await Contact.findByIdAndDelete(req.params.id);
  req.flash('success', 'Message deleted.');
  res.redirect('/admin/contacts');
});

// ── NOTICES ───────────────────────────────────────────────────────────────
router.get('/notices', requireAuth, async (req, res) => {
  const notices = await Notice.find().sort({ createdAt: -1 }).lean();
  res.render('admin/notices', { title: 'Notices — Admin', notices, adminName: req.session.adminName });
});

router.get('/notices/new', requireAuth, (req, res) => {
  res.render('admin/notice-form', { title: 'New Notice — Admin', notice: null, adminName: req.session.adminName });
});

router.post('/notices', requireAuth, async (req, res) => {
  try {
    const { title, content, category, isImportant } = req.body;
    await Notice.create({ title, content, category, isImportant: !!isImportant });
    req.flash('success', 'Notice published successfully!');
    res.redirect('/admin/notices');
  } catch (err) {
    req.flash('error', 'Failed to create notice.');
    res.redirect('/admin/notices/new');
  }
});

router.get('/notices/:id/edit', requireAuth, async (req, res) => {
  const notice = await Notice.findById(req.params.id).lean();
  res.render('admin/notice-form', { title: 'Edit Notice — Admin', notice, adminName: req.session.adminName });
});

router.put('/notices/:id', requireAuth, async (req, res) => {
  const { title, content, category, isImportant } = req.body;
  await Notice.findByIdAndUpdate(req.params.id, { title, content, category, isImportant: !!isImportant });
  req.flash('success', 'Notice updated!');
  res.redirect('/admin/notices');
});

router.delete('/notices/:id', requireAuth, async (req, res) => {
  await Notice.findByIdAndDelete(req.params.id);
  req.flash('success', 'Notice deleted.');
  res.redirect('/admin/notices');
});

// ── FACULTY LIST ──────────────────────────────────────────────────────────
router.get('/faculty', requireAuth, async (req, res) => {
  try {
    const { dept } = req.query;
    const filter = dept && dept !== 'All' ? { department: dept } : {};
    const faculty = await Faculty.find(filter).sort({ isHOD: -1, order: 1, createdAt: 1 }).lean();
    const departments = ['All', 'Electrical Engineering', 'Computer Engineering', 'AI & Machine Learning', 'Electronics & Communication', 'Science & Humanities'];
    res.render('admin/faculty', {
      title: 'Faculty — Admin',
      faculty,
      departments,
      activeDept: dept || 'All',
      adminName: req.session.adminName
    });
  } catch (err) {
    req.flash('error', 'Failed to load faculty.');
    res.redirect('/admin/dashboard');
  }
});

// ── ADD FACULTY FORM ──────────────────────────────────────────────────────
router.get('/faculty/new', requireAuth, (req, res) => {
  res.render('admin/faculty-form', {
    title: 'Add Faculty — Admin',
    faculty: null,
    adminName: req.session.adminName
  });
});

// ── CREATE FACULTY ────────────────────────────────────────────────────────
router.post('/faculty', requireAuth, (req, res) => {
  uploadFaculty.single('photo')(req, res, async (err) => {
    if (err) {
      req.flash('error', `Upload error: ${err.message}`);
      return res.redirect('/admin/faculty/new');
    }
    try {
      const { name, designation, department, qualification, experience, specialization, email, phone, isHOD, order } = req.body;
      await Faculty.create({
        name, designation, department, qualification,
        experience, specialization, email, phone,
        isHOD: !!isHOD,
        order: order || 0,
        imageUrl:      req.file ? req.file.path     : null,
        imagePublicId: req.file ? req.file.filename : null,
      });
      req.flash('success', `${name} has been added to faculty!`);
      res.redirect('/admin/faculty');
    } catch (e) {
      req.flash('error', 'Failed to add faculty. Please check all fields.');
      res.redirect('/admin/faculty/new');
    }
  });
});

// ── EDIT FACULTY FORM ─────────────────────────────────────────────────────
router.get('/faculty/:id/edit', requireAuth, async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id).lean();
    if (!faculty) { req.flash('error', 'Faculty not found.'); return res.redirect('/admin/faculty'); }
    res.render('admin/faculty-form', {
      title: 'Edit Faculty — Admin',
      faculty,
      adminName: req.session.adminName
    });
  } catch (err) {
    req.flash('error', 'Faculty not found.');
    res.redirect('/admin/faculty');
  }
});

// ── UPDATE FACULTY ────────────────────────────────────────────────────────
router.put('/faculty/:id', requireAuth, (req, res) => {
  uploadFaculty.single('photo')(req, res, async (err) => {
    if (err) {
      req.flash('error', `Upload error: ${err.message}`);
      return res.redirect(`/admin/faculty/${req.params.id}/edit`);
    }
    try {
      const existing = await Faculty.findById(req.params.id);
      if (!existing) { req.flash('error', 'Faculty not found.'); return res.redirect('/admin/faculty'); }

      const { name, designation, department, qualification, experience, specialization, email, phone, isHOD, order } = req.body;

      const updateData = {
        name, designation, department, qualification,
        experience, specialization, email, phone,
        isHOD: !!isHOD,
        order: order || 0,
      };

      // If a new photo was uploaded, delete old one from Cloudinary
      if (req.file) {
        if (existing.imagePublicId) {
          await cloudinary.uploader.destroy(existing.imagePublicId);
        }
        updateData.imageUrl      = req.file.path;
        updateData.imagePublicId = req.file.filename;
      }

      await Faculty.findByIdAndUpdate(req.params.id, updateData, { new: true });
      req.flash('success', `${name}'s details have been updated!`);
      res.redirect('/admin/faculty');
    } catch (e) {
      req.flash('error', 'Failed to update faculty.');
      res.redirect(`/admin/faculty/${req.params.id}/edit`);
    }
  });
});

// ── DELETE FACULTY ────────────────────────────────────────────────────────
router.delete('/faculty/:id', requireAuth, async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) { req.flash('error', 'Faculty not found.'); return res.redirect('/admin/faculty'); }

    // Delete photo from Cloudinary if exists
    if (faculty.imagePublicId) {
      await cloudinary.uploader.destroy(faculty.imagePublicId);
    }

    await Faculty.findByIdAndDelete(req.params.id);
    req.flash('success', `${faculty.name} has been removed from faculty.`);
    res.redirect('/admin/faculty');
  } catch (err) {
    req.flash('error', 'Failed to delete faculty.');
    res.redirect('/admin/faculty');
  }
});

// ══════════════════════════════════════════════════════════════════════════
// ── GALLERY ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

// LIST — with category filter
router.get('/gallery', requireAuth, async (req, res) => {
  try {
    const { cat } = req.query;
    const filter = cat && cat !== 'All' ? { category: cat } : {};
    const images = await Gallery.find(filter).sort({ isFeatured: -1, order: 1, createdAt: -1 }).lean();
    const counts = await Gallery.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    const categoryCounts = { All: await Gallery.countDocuments() };
    counts.forEach(c => { categoryCounts[c._id] = c.count; });

    res.render('admin/gallery', {
      title: 'Gallery — Admin',
      images,
      categoryCounts,
      activeCat: cat || 'All',
      adminName: req.session.adminName
    });
  } catch (err) {
    req.flash('error', 'Failed to load gallery.');
    res.redirect('/admin/dashboard');
  }
});

// NEW FORM
router.get('/gallery/new', requireAuth, (req, res) => {
  res.render('admin/gallery-form', {
    title: 'Upload Photos — Admin',
    image: null,
    adminName: req.session.adminName
  });
});

// CREATE — supports single upload with title/category/description
router.post('/gallery', requireAuth, (req, res) => {
  uploadGallery.single('image')(req, res, async (err) => {
    if (err) {
      req.flash('error', `Upload error: ${err.message}`);
      return res.redirect('/admin/gallery/new');
    }
    try {
      if (!req.file) {
        req.flash('error', 'Please select an image to upload.');
        return res.redirect('/admin/gallery/new');
      }
      const { title, description, category, isFeatured, order, takenAt } = req.body;
      await Gallery.create({
        title, description, category,
        isFeatured: !!isFeatured,
        order: order || 0,
        takenAt: takenAt || null,
        imageUrl:      req.file.path,
        imagePublicId: req.file.filename,
      });
      req.flash('success', `"${title}" uploaded to gallery!`);
      res.redirect('/admin/gallery');
    } catch (e) {
      req.flash('error', 'Failed to save image details.');
      res.redirect('/admin/gallery/new');
    }
  });
});

// BULK UPLOAD — multiple images at once (title auto-generated)
router.post('/gallery/bulk', requireAuth, (req, res) => {
  uploadGallery.array('images', 20)(req, res, async (err) => {
    if (err) {
      req.flash('error', `Upload error: ${err.message}`);
      return res.redirect('/admin/gallery/new');
    }
    try {
      if (!req.files || req.files.length === 0) {
        req.flash('error', 'Please select at least one image.');
        return res.redirect('/admin/gallery/new');
      }
      const { category, bulkPrefix } = req.body;
      const docs = req.files.map((file, i) => ({
        title:         `${bulkPrefix || category} ${i + 1}`,
        category:      category || 'Campus',
        imageUrl:      file.path,
        imagePublicId: file.filename,
      }));
      await Gallery.insertMany(docs);
      req.flash('success', `${req.files.length} image${req.files.length > 1 ? 's' : ''} uploaded successfully!`);
      res.redirect('/admin/gallery');
    } catch (e) {
      req.flash('error', 'Bulk upload failed.');
      res.redirect('/admin/gallery/new');
    }
  });
});

// EDIT FORM
router.get('/gallery/:id/edit', requireAuth, async (req, res) => {
  try {
    const image = await Gallery.findById(req.params.id).lean();
    if (!image) { req.flash('error', 'Image not found.'); return res.redirect('/admin/gallery'); }
    res.render('admin/gallery-form', {
      title: 'Edit Photo — Admin',
      image,
      adminName: req.session.adminName
    });
  } catch (err) {
    req.flash('error', 'Image not found.');
    res.redirect('/admin/gallery');
  }
});

// UPDATE — can replace image or just update metadata
router.put('/gallery/:id', requireAuth, (req, res) => {
  uploadGallery.single('image')(req, res, async (err) => {
    if (err) {
      req.flash('error', `Upload error: ${err.message}`);
      return res.redirect(`/admin/gallery/${req.params.id}/edit`);
    }
    try {
      const existing = await Gallery.findById(req.params.id);
      if (!existing) { req.flash('error', 'Image not found.'); return res.redirect('/admin/gallery'); }

      const { title, description, category, isFeatured, order, takenAt } = req.body;
      const updateData = {
        title, description, category,
        isFeatured: !!isFeatured,
        order: order || 0,
        takenAt: takenAt || null,
      };

      // Replace image in Cloudinary if a new one was uploaded
      if (req.file) {
        await cloudinary.uploader.destroy(existing.imagePublicId);
        updateData.imageUrl      = req.file.path;
        updateData.imagePublicId = req.file.filename;
      }

      await Gallery.findByIdAndUpdate(req.params.id, updateData);
      req.flash('success', `"${title}" has been updated!`);
      res.redirect('/admin/gallery');
    } catch (e) {
      req.flash('error', 'Failed to update image.');
      res.redirect(`/admin/gallery/${req.params.id}/edit`);
    }
  });
});

// DELETE SINGLE
router.delete('/gallery/:id', requireAuth, async (req, res) => {
  try {
    const image = await Gallery.findById(req.params.id);
    if (!image) { req.flash('error', 'Image not found.'); return res.redirect('/admin/gallery'); }
    await cloudinary.uploader.destroy(image.imagePublicId);
    await Gallery.findByIdAndDelete(req.params.id);
    req.flash('success', `"${image.title}" deleted from gallery.`);
    res.redirect('/admin/gallery');
  } catch (err) {
    req.flash('error', 'Failed to delete image.');
    res.redirect('/admin/gallery');
  }
});

// TOGGLE FEATURED
router.post('/gallery/:id/feature', requireAuth, async (req, res) => {
  try {
    const image = await Gallery.findById(req.params.id);
    if (!image) return res.json({ success: false });
    image.isFeatured = !image.isFeatured;
    await image.save();
    res.json({ success: true, isFeatured: image.isFeatured });
  } catch (err) {
    res.json({ success: false });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// ── GRIEVANCES ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

// LIST
router.get('/grievances', requireAuth, async (req, res) => {
  try {
    const grievances = await Grievance.find().sort({ srNo: 1 }).lean();
    res.render('admin/grievances', {
      title: 'Grievances — Admin',
      grievances,
      adminName: req.session.adminName
    });
  } catch (err) {
    req.flash('error', 'Failed to load grievances.');
    res.redirect('/admin/dashboard');
  }
});

// NEW FORM
router.get('/grievances/new', requireAuth, async (req, res) => {
  // Auto-compute next Sr. No
  const last = await Grievance.findOne().sort({ srNo: -1 }).lean();
  const nextSrNo = last ? last.srNo + 1 : 1;
  res.render('admin/grievance-form', {
    title: 'Add Grievance Cell — Admin',
    grievance: null,
    nextSrNo,
    adminName: req.session.adminName
  });
});

// CREATE
router.post('/grievances', requireAuth, uploadGrievancePDF, async (req, res) => {
  try {
    const { srNo, name, description, isActive } = req.body;
    await Grievance.create({
      srNo:        parseInt(srNo),
      name,
      description,
      isActive:    isActive !== 'false',
      pdfUrl:      req.file ? req.file.cloudinaryUrl       : null,
      pdfPublicId: req.file ? req.file.cloudinaryPublicId    : null,
      pdfName:     req.file ? req.file.originalname : null,
    });
    req.flash('success', `"${name}" added successfully!`);
    res.redirect('/admin/grievances');
  } catch (e) {
    req.flash('error', 'Failed to add grievance cell. Check all fields.');
    res.redirect('/admin/grievances/new');
  }
});

// EDIT FORM
router.get('/grievances/:id/edit', requireAuth, async (req, res) => {
  try {
    const grievance = await Grievance.findById(req.params.id).lean();
    if (!grievance) { req.flash('error', 'Record not found.'); return res.redirect('/admin/grievances'); }
    res.render('admin/grievance-form', {
      title: 'Edit Grievance Cell — Admin',
      grievance,
      nextSrNo: grievance.srNo,
      adminName: req.session.adminName
    });
  } catch (err) {
    req.flash('error', 'Record not found.');
    res.redirect('/admin/grievances');
  }
});

// UPDATE
router.put('/grievances/:id', requireAuth, uploadGrievancePDF, async (req, res) => {
  try {
    const existing = await Grievance.findById(req.params.id);
    if (!existing) { req.flash('error', 'Record not found.'); return res.redirect('/admin/grievances'); }

    const { srNo, name, description, isActive } = req.body;
    const updateData = {
      srNo:     parseInt(srNo),
      name,
      description,
      isActive: isActive !== 'false',
      updatedAt: Date.now()
    };

    if (req.file) {
      await destroyPDF(existing.pdfPublicId);
      updateData.pdfUrl      = req.file.cloudinaryUrl;
      updateData.pdfPublicId = req.file.cloudinaryPublicId;
      updateData.pdfName     = req.file.originalname;
    }

    await Grievance.findByIdAndUpdate(req.params.id, updateData);
    req.flash('success', `"${name}" updated successfully!`);
    res.redirect('/admin/grievances');
  } catch (e) {
    req.flash('error', 'Failed to update record.');
    res.redirect(`/admin/grievances/${req.params.id}/edit`);
  }
});

// DELETE PDF only (keep record, remove PDF)
router.post('/grievances/:id/remove-pdf', requireAuth, async (req, res) => {
  try {
    const g = await Grievance.findById(req.params.id);
    if (g && g.pdfPublicId) {
      await destroyPDF(g.pdfPublicId);
      await Grievance.findByIdAndUpdate(req.params.id, { pdfUrl: null, pdfPublicId: null, pdfName: null });
    }
    req.flash('success', 'PDF removed successfully.');
    res.redirect(`/admin/grievances/${req.params.id}/edit`);
  } catch (err) {
    req.flash('error', 'Failed to remove PDF.');
    res.redirect('/admin/grievances');
  }
});

// DELETE RECORD
router.delete('/grievances/:id', requireAuth, async (req, res) => {
  try {
    const g = await Grievance.findById(req.params.id);
    if (!g) { req.flash('error', 'Record not found.'); return res.redirect('/admin/grievances'); }
    await destroyPDF(g.pdfPublicId);
    await Grievance.findByIdAndDelete(req.params.id);
    req.flash('success', `"${g.name}" deleted.`);
    res.redirect('/admin/grievances');
  } catch (err) {
    req.flash('error', 'Failed to delete record.');
    res.redirect('/admin/grievances');
  }
});

// REORDER (AJAX) — update srNo
router.post('/grievances/reorder', requireAuth, async (req, res) => {
  try {
    const { order } = req.body; // [{id, srNo}, ...]
    await Promise.all(order.map(item =>
      Grievance.findByIdAndUpdate(item.id, { srNo: parseInt(item.srNo) })
    ));
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// ── SYLLABUS ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

const DEPTS = ['Electrical Engineering','Computer Engineering','AI & Machine Learning','Electronics & Communication'];
const SEMESTERS = [1,2,3,4,5,6];
const SYL_TYPES = ['MSBTE Curriculum'];

// LIST — grouped by dept & semester
router.get('/syllabus', requireAuth, async (req, res) => {
  try {
    const { dept, sem } = req.query;
    const filter = dept && dept !== 'All' ? { department: dept } : {};
    const docs = await Syllabus.find(filter).sort({ department:1, semester:1, type:1 }).lean();

    // Subject syllabus filter
    const subFilter = { ...filter };
    if (sem && sem !== 'All') subFilter.semester = parseInt(sem);
    const subjectDocs = await SubjectSyllabus.find(subFilter)
      .sort({ department:1, semester:1, order:1, subjectName:1 }).lean();

    // Group curriculum: { dept -> { sem -> { type -> doc } } }
    const grouped = {};
    DEPTS.forEach(d => { grouped[d] = {}; SEMESTERS.forEach(s => { grouped[d][s] = {}; }); });
    docs.forEach(doc => {
      if (!grouped[doc.department]) grouped[doc.department] = {};
      if (!grouped[doc.department][doc.semester]) grouped[doc.department][doc.semester] = {};
      grouped[doc.department][doc.semester][doc.type] = doc;
    });

    res.render('admin/syllabus', {
      title: 'Syllabus — Admin',
      grouped, docs, subjectDocs, DEPTS, SEMESTERS, SYL_TYPES,
      activeDept: dept || 'All',
      activeSemFilter: sem || 'All',
      adminName: req.session.adminName
    });
  } catch (err) {
    req.flash('error', 'Failed to load syllabus records.');
    res.redirect('/admin/dashboard');
  }
});

// NEW FORM
router.get('/syllabus/new', requireAuth, (req, res) => {
  res.render('admin/syllabus-form', {
    title: 'Upload Syllabus — Admin',
    doc: null,
    DEPTS, SEMESTERS, SYL_TYPES,
    prefillDept: req.query.dept || '',
    prefillSem:  req.query.sem  || '',
    prefillType: req.query.type || '',
    adminName: req.session.adminName
  });
});

// CREATE
router.post('/syllabus', requireAuth, uploadSyllabusPDF, async (req, res) => {
  try {
    const { department, semester, type, title, description, academicYear, isActive } = req.body;

    const existing = await Syllabus.findOne({ department, semester: parseInt(semester), type });
    if (existing) {
      req.flash('error', `A ${type} for Semester ${semester} of ${department} already exists. Edit it instead.`);
      return res.redirect('/admin/syllabus');
    }

    await Syllabus.create({
      department, semester: parseInt(semester), type, title, description,
      academicYear, isActive: isActive !== 'false',
      pdfUrl:      req.file ? req.file.cloudinaryUrl       : null,
      pdfPublicId: req.file ? req.file.cloudinaryPublicId    : null,
      pdfName:     req.file ? req.file.originalname : null,
    });
    req.flash('success', `${type} for Sem ${semester} — ${department} uploaded!`);
    res.redirect('/admin/syllabus');
  } catch (e) {
    req.flash('error', 'Failed to save. Check all fields.');
    res.redirect('/admin/syllabus/new');
  }
});

// EDIT FORM
router.get('/syllabus/:id/edit', requireAuth, async (req, res) => {
  try {
    const doc = await Syllabus.findById(req.params.id).lean();
    if (!doc) { req.flash('error', 'Record not found.'); return res.redirect('/admin/syllabus'); }
    res.render('admin/syllabus-form', {
      title: 'Edit Syllabus — Admin',
      doc, DEPTS, SEMESTERS, SYL_TYPES,
      prefillDept: '', prefillSem: '', prefillType: '',
      adminName: req.session.adminName
    });
  } catch (err) {
    req.flash('error', 'Record not found.');
    res.redirect('/admin/syllabus');
  }
});

// UPDATE
router.put('/syllabus/:id', requireAuth, uploadSyllabusPDF, async (req, res) => {
  try {
    const existing = await Syllabus.findById(req.params.id);
    if (!existing) { req.flash('error', 'Record not found.'); return res.redirect('/admin/syllabus'); }

    const { department, semester, type, title, description, academicYear, isActive } = req.body;
    const updateData = {
      department, semester: parseInt(semester), type, title, description,
      academicYear, isActive: isActive !== 'false', updatedAt: Date.now()
    };

    if (req.file) {
      await destroyPDF(existing.pdfPublicId);
      updateData.pdfUrl      = req.file.cloudinaryUrl;
      updateData.pdfPublicId = req.file.cloudinaryPublicId;
      updateData.pdfName     = req.file.originalname;
    }

    await Syllabus.findByIdAndUpdate(req.params.id, updateData);
    req.flash('success', `${type} — Sem ${semester} updated!`);
    res.redirect('/admin/syllabus');
  } catch (e) {
    req.flash('error', 'Failed to update record.');
    res.redirect(`/admin/syllabus/${req.params.id}/edit`);
  }
});

// REMOVE PDF only
router.post('/syllabus/:id/remove-pdf', requireAuth, async (req, res) => {
  try {
    const doc = await Syllabus.findById(req.params.id);
    if (doc && doc.pdfPublicId) {
      await destroyPDF(doc.pdfPublicId);
      await Syllabus.findByIdAndUpdate(req.params.id, { pdfUrl: null, pdfPublicId: null, pdfName: null });
    }
    req.flash('success', 'PDF removed.');
    res.redirect(`/admin/syllabus/${req.params.id}/edit`);
  } catch (err) {
    req.flash('error', 'Failed to remove PDF.');
    res.redirect('/admin/syllabus');
  }
});

// DELETE
router.delete('/syllabus/:id', requireAuth, async (req, res) => {
  try {
    const doc = await Syllabus.findById(req.params.id);
    if (!doc) { req.flash('error', 'Record not found.'); return res.redirect('/admin/syllabus'); }
    await destroyPDF(doc.pdfPublicId);
    await Syllabus.findByIdAndDelete(req.params.id);
    req.flash('success', `${doc.type} — Sem ${doc.semester} deleted.`);
    res.redirect('/admin/syllabus');
  } catch (err) {
    req.flash('error', 'Failed to delete record.');
    res.redirect('/admin/syllabus');
  }
});


// ══════════════════════════════════════════════════════════════════════════
// ── SUBJECT SYLLABUS (per-subject PDF per semester) ───────────────────────
// ══════════════════════════════════════════════════════════════════════════

// LIST (ajax/filter used from syllabus page)
router.get('/subject-syllabus', requireAuth, async (req, res) => {
  try {
    const { dept, sem } = req.query;
    const filter = {};
    if (dept && dept !== 'All') filter.department = dept;
    if (sem  && sem  !== 'All') filter.semester   = parseInt(sem);
    const subjects = await SubjectSyllabus.find(filter)
      .sort({ department:1, semester:1, order:1, subjectName:1 }).lean();
    res.json({ ok: true, subjects });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// NEW FORM
router.get('/subject-syllabus/new', requireAuth, (req, res) => {
  res.render('admin/subject-syllabus-form', {
    title: 'Add Subject Syllabus — Admin',
    subject: null,
    DEPTS, SEMESTERS,
    prefillDept: req.query.dept || '',
    prefillSem:  req.query.sem  || '',
    adminName: req.session.adminName
  });
});

// CREATE
router.post('/subject-syllabus', requireAuth, uploadSubjectSyllabusPDF, async (req, res) => {
  try {
    const { department, semester, subjectCode, subjectName, description, academicYear, isActive, order } = req.body;
    await SubjectSyllabus.create({
      department, semester: parseInt(semester),
      subjectCode: subjectCode || '',
      subjectName, description, academicYear,
      isActive: isActive !== 'false',
      order: parseInt(order) || 0,
      pdfUrl:      req.file ? req.file.cloudinaryUrl      : null,
      pdfPublicId: req.file ? req.file.cloudinaryPublicId : null,
      pdfName:     req.file ? req.file.originalname       : null,
    });
    req.flash('success', `"${subjectName}" subject syllabus added!`);
    res.redirect(`/admin/syllabus?dept=${encodeURIComponent(department)}&sem=${semester}`);
  } catch (e) {
    req.flash('error', 'Failed to add. Check all fields.');
    res.redirect('/admin/subject-syllabus/new');
  }
});

// EDIT FORM
router.get('/subject-syllabus/:id/edit', requireAuth, async (req, res) => {
  try {
    const subject = await SubjectSyllabus.findById(req.params.id).lean();
    if (!subject) { req.flash('error', 'Subject not found.'); return res.redirect('/admin/syllabus'); }
    res.render('admin/subject-syllabus-form', {
      title: 'Edit Subject Syllabus — Admin',
      subject,
      DEPTS, SEMESTERS,
      prefillDept: '', prefillSem: '',
      adminName: req.session.adminName
    });
  } catch (err) {
    req.flash('error', 'Subject not found.');
    res.redirect('/admin/syllabus');
  }
});

// UPDATE
router.put('/subject-syllabus/:id', requireAuth, uploadSubjectSyllabusPDF, async (req, res) => {
  try {
    const existing = await SubjectSyllabus.findById(req.params.id);
    if (!existing) { req.flash('error', 'Subject not found.'); return res.redirect('/admin/syllabus'); }

    const { department, semester, subjectCode, subjectName, description, academicYear, isActive, order } = req.body;
    const updateData = {
      department, semester: parseInt(semester),
      subjectCode: subjectCode || '',
      subjectName, description, academicYear,
      isActive: isActive !== 'false',
      order: parseInt(order) || 0,
      updatedAt: Date.now()
    };

    if (req.file) {
      await destroyPDF(existing.pdfPublicId);
      updateData.pdfUrl      = req.file.cloudinaryUrl;
      updateData.pdfPublicId = req.file.cloudinaryPublicId;
      updateData.pdfName     = req.file.originalname;
    }

    await SubjectSyllabus.findByIdAndUpdate(req.params.id, updateData);
    req.flash('success', `"${subjectName}" updated!`);
    res.redirect(`/admin/syllabus?dept=${encodeURIComponent(department)}&sem=${semester}`);
  } catch (e) {
    req.flash('error', 'Failed to update.');
    res.redirect(`/admin/subject-syllabus/${req.params.id}/edit`);
  }
});

// REMOVE PDF
router.post('/subject-syllabus/:id/remove-pdf', requireAuth, async (req, res) => {
  try {
    const s = await SubjectSyllabus.findById(req.params.id);
    if (s && s.pdfPublicId) {
      await destroyPDF(s.pdfPublicId);
      await SubjectSyllabus.findByIdAndUpdate(req.params.id, { pdfUrl: null, pdfPublicId: null, pdfName: null });
    }
    req.flash('success', 'PDF removed.');
    res.redirect(`/admin/subject-syllabus/${req.params.id}/edit`);
  } catch (err) {
    req.flash('error', 'Failed to remove PDF.');
    res.redirect('/admin/syllabus');
  }
});

// DELETE
router.delete('/subject-syllabus/:id', requireAuth, async (req, res) => {
  try {
    const s = await SubjectSyllabus.findById(req.params.id);
    if (!s) { req.flash('error', 'Subject not found.'); return res.redirect('/admin/syllabus'); }
    await destroyPDF(s.pdfPublicId);
    await SubjectSyllabus.findByIdAndDelete(req.params.id);
    req.flash('success', `"${s.subjectName}" deleted.`);
    res.redirect(`/admin/syllabus?dept=${encodeURIComponent(s.department)}&sem=${s.semester}`);
  } catch (err) {
    req.flash('error', 'Failed to delete.');
    res.redirect('/admin/syllabus');
  }
});

// ══════════════════════════════════════════════════════════════════════════
// ── LAB MANUALS (per-subject) ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

// LIST — all subjects for a given dept + semester
router.get('/lab-manuals', requireAuth, async (req, res) => {
  try {
    const { dept, sem } = req.query;
    const filter = {};
    if (dept && dept !== 'All') filter.department = dept;
    if (sem  && sem  !== 'All') filter.semester = parseInt(sem);

    const manuals = await LabManual.find(filter).sort({ department:1, semester:1, order:1, subjectName:1 }).lean();

    // Build grouped: { dept -> { sem -> [manuals] } }
    const grouped = {};
    DEPTS.forEach(d => { grouped[d] = {}; SEMESTERS.forEach(s => { grouped[d][s] = []; }); });
    manuals.forEach(m => {
      if (grouped[m.department] && grouped[m.department][m.semester] !== undefined)
        grouped[m.department][m.semester].push(m);
    });

    res.render('admin/lab-manuals', {
      title: 'Lab Manuals — Admin',
      manuals, grouped, DEPTS, SEMESTERS,
      activeDept: dept || 'All',
      activeSem:  sem  || 'All',
      adminName: req.session.adminName
    });
  } catch (err) {
    req.flash('error', 'Failed to load lab manuals.');
    res.redirect('/admin/dashboard');
  }
});

// NEW FORM
router.get('/lab-manuals/new', requireAuth, (req, res) => {
  res.render('admin/lab-manual-form', {
    title: 'Add Lab Manual — Admin',
    manual: null,
    DEPTS, SEMESTERS,
    prefillDept: req.query.dept || '',
    prefillSem:  req.query.sem  || '',
    adminName: req.session.adminName
  });
});

// CREATE
router.post('/lab-manuals', requireAuth, uploadLabManualPDF, async (req, res) => {
  try {
    const { department, semester, subjectCode, subjectName, description, academicYear, isActive, order } = req.body;
    await LabManual.create({
      department, semester: parseInt(semester),
      subjectCode: subjectCode || '',
      subjectName, description, academicYear,
      isActive: isActive !== 'false',
      order: parseInt(order) || 0,
      pdfUrl:      req.file ? req.file.cloudinaryUrl       : null,
      pdfPublicId: req.file ? req.file.cloudinaryPublicId    : null,
      pdfName:     req.file ? req.file.originalname : null,
    });
    req.flash('success', `Lab Manual for "${subjectName}" added!`);
    res.redirect(`/admin/lab-manuals?dept=${encodeURIComponent(department)}&sem=${semester}`);
  } catch (e) {
    req.flash('error', 'Failed to save. Check all fields.');
    res.redirect('/admin/lab-manuals/new');
  }
});

// EDIT FORM
router.get('/lab-manuals/:id/edit', requireAuth, async (req, res) => {
  try {
    const manual = await LabManual.findById(req.params.id).lean();
    if (!manual) { req.flash('error', 'Lab manual not found.'); return res.redirect('/admin/lab-manuals'); }
    res.render('admin/lab-manual-form', {
      title: 'Edit Lab Manual — Admin',
      manual, DEPTS, SEMESTERS,
      prefillDept: '', prefillSem: '',
      adminName: req.session.adminName
    });
  } catch (err) {
    req.flash('error', 'Lab manual not found.');
    res.redirect('/admin/lab-manuals');
  }
});

// UPDATE
router.put('/lab-manuals/:id', requireAuth, uploadLabManualPDF, async (req, res) => {
  try {
    const existing = await LabManual.findById(req.params.id);
    if (!existing) { req.flash('error', 'Lab manual not found.'); return res.redirect('/admin/lab-manuals'); }

    const { department, semester, subjectCode, subjectName, description, academicYear, isActive, order } = req.body;
    const updateData = {
      department, semester: parseInt(semester),
      subjectCode: subjectCode || '',
      subjectName, description, academicYear,
      isActive: isActive !== 'false',
      order: parseInt(order) || 0,
      updatedAt: Date.now()
    };

    if (req.file) {
      await destroyPDF(existing.pdfPublicId);
      updateData.pdfUrl      = req.file.cloudinaryUrl;
      updateData.pdfPublicId = req.file.cloudinaryPublicId;
      updateData.pdfName     = req.file.originalname;
    }

    await LabManual.findByIdAndUpdate(req.params.id, updateData);
    req.flash('success', `"${subjectName}" updated!`);
    res.redirect(`/admin/lab-manuals?dept=${encodeURIComponent(department)}&sem=${semester}`);
  } catch (e) {
    req.flash('error', 'Failed to update.');
    res.redirect(`/admin/lab-manuals/${req.params.id}/edit`);
  }
});

// REMOVE PDF only
router.post('/lab-manuals/:id/remove-pdf', requireAuth, async (req, res) => {
  try {
    const m = await LabManual.findById(req.params.id);
    if (m && m.pdfPublicId) {
      await destroyPDF(m.pdfPublicId);
      await LabManual.findByIdAndUpdate(req.params.id, { pdfUrl: null, pdfPublicId: null, pdfName: null });
    }
    req.flash('success', 'PDF removed.');
    res.redirect(`/admin/lab-manuals/${req.params.id}/edit`);
  } catch (err) {
    req.flash('error', 'Failed to remove PDF.');
    res.redirect('/admin/lab-manuals');
  }
});

// DELETE
router.delete('/lab-manuals/:id', requireAuth, async (req, res) => {
  try {
    const m = await LabManual.findById(req.params.id);
    if (!m) { req.flash('error', 'Not found.'); return res.redirect('/admin/lab-manuals'); }
    await destroyPDF(m.pdfPublicId);
    await LabManual.findByIdAndDelete(req.params.id);
    req.flash('success', `"${m.subjectName}" deleted.`);
    res.redirect(`/admin/lab-manuals?dept=${encodeURIComponent(m.department)}&sem=${m.semester}`);
  } catch (err) {
    req.flash('error', 'Failed to delete.');
    res.redirect('/admin/lab-manuals');
  }
});


// ══════════════════════════════════════════════════════════════════════════
// ── MANAGEMENT (Fee Receipts + Bonafide Certificates) ────────────────────
// ══════════════════════════════════════════════════════════════════════════

// DASHBOARD
router.get('/management', requireAuth, async (req, res) => {
  try {
    const [recentReceipts, recentBonafides, totalReceipts, totalBonafides] = await Promise.all([
      FeeReceipt.find().sort({ createdAt: -1 }).limit(8).lean(),
      Bonafide.find().sort({ createdAt: -1 }).limit(8).lean(),
      FeeReceipt.countDocuments(),
      Bonafide.countDocuments()
    ]);
    res.render('admin/management', {
      title: 'Management — Admin',
      recentReceipts, recentBonafides, totalReceipts, totalBonafides,
      adminName: req.session.adminName
    });
  } catch (err) {
    req.flash('error', 'Failed to load management data.');
    res.redirect('/admin/dashboard');
  }
});

// ── FEE RECEIPTS ──────────────────────────────────────────────────────────

// LIST
router.get('/management/receipts', requireAuth, async (req, res) => {
  try {
    const { q } = req.query;
    const filter = q ? { studentName: { $regex: q, $options: 'i' } } : {};
    const receipts = await FeeReceipt.find(filter).sort({ receiptNo: -1 }).lean();
    res.render('admin/receipts', {
      title: 'Fee Receipts — Admin',
      receipts, q: q || '',
      adminName: req.session.adminName
    });
  } catch (err) {
    req.flash('error', 'Failed to load receipts.');
    res.redirect('/admin/management');
  }
});

// NEW FORM
router.get('/management/receipts/new', requireAuth, (req, res) => {
  res.render('admin/receipt-form', {
    title: 'New Fee Receipt — Admin',
    receipt: null,
    adminName: req.session.adminName
  });
});

// CREATE
router.post('/management/receipts', requireAuth, async (req, res) => {
  try {
    const { date, studentName, className, course, enrollmentNo, amountInWords } = req.body;
    // auto receipt number
    const last = await FeeReceipt.findOne().sort({ receiptNo: -1 }).lean();
    const receiptNo = last && last.receiptNo ? last.receiptNo + 1 : 1;

    const feeKeys = ['tuitionFees','developmentFees','admissionFees','libraryDeposit',
      'libraryFees','laboratoryFees','gymkhana','studentsCouncil','collegeMagazine',
      'identityCardInsurance','culturalActivities','studentsWelfare','eligibilityFees',
      'msbteExamFees','internetFees','alumniCharges','tcFees','fine','bonafideFees',
      'other','extra1','extra2'];
    const fees = {};
    let total = 0;
    feeKeys.forEach(k => {
      const v = parseFloat(req.body[k]) || 0;
      fees[k] = v;
      total += v;
    });

    const r = await FeeReceipt.create({
      receiptNo, date, studentName, className, course, enrollmentNo,
      fees, total,
      amountInWords: amountInWords || numberToWords(total)
    });
    req.flash('success', `Receipt #${receiptNo} created for ${studentName}.`);
    res.redirect(`/admin/management/receipts/${r._id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to create receipt.');
    res.redirect('/admin/management/receipts/new');
  }
});

// VIEW + DOWNLOAD ACTIONS
router.get('/management/receipts/:id', requireAuth, async (req, res) => {
  try {
    const receipt = await FeeReceipt.findById(req.params.id).lean();
    if (!receipt) { req.flash('error', 'Receipt not found.'); return res.redirect('/admin/management/receipts'); }
    res.render('admin/receipt-detail', {
      title: `Receipt #${receipt.receiptNo} — Admin`,
      receipt,
      adminName: req.session.adminName
    });
  } catch (err) {
    req.flash('error', 'Not found.'); res.redirect('/admin/management/receipts');
  }
});

// DOWNLOAD PDF
router.get('/management/receipts/:id/download', requireAuth, async (req, res) => {
  try {
    const receipt = await FeeReceipt.findById(req.params.id).lean();
    if (!receipt) return res.status(404).send('Not found.');
    generateFeeReceiptPDF(receipt, res);
  } catch (err) {
    res.status(500).send('PDF generation failed.');
  }
});

// EDIT
router.get('/management/receipts/:id/edit', requireAuth, async (req, res) => {
  try {
    const receipt = await FeeReceipt.findById(req.params.id).lean();
    if (!receipt) { req.flash('error', 'Not found.'); return res.redirect('/admin/management/receipts'); }
    res.render('admin/receipt-form', {
      title: `Edit Receipt #${receipt.receiptNo} — Admin`,
      receipt,
      adminName: req.session.adminName
    });
  } catch (err) {
    req.flash('error', 'Not found.'); res.redirect('/admin/management/receipts');
  }
});

// UPDATE
router.put('/management/receipts/:id', requireAuth, async (req, res) => {
  try {
    const { date, studentName, className, course, enrollmentNo, amountInWords } = req.body;
    const feeKeys = ['tuitionFees','developmentFees','admissionFees','libraryDeposit',
      'libraryFees','laboratoryFees','gymkhana','studentsCouncil','collegeMagazine',
      'identityCardInsurance','culturalActivities','studentsWelfare','eligibilityFees',
      'msbteExamFees','internetFees','alumniCharges','tcFees','fine','bonafideFees',
      'other','extra1','extra2'];
    const fees = {};
    let total = 0;
    feeKeys.forEach(k => {
      const v = parseFloat(req.body[k]) || 0;
      fees[k] = v; total += v;
    });
    await FeeReceipt.findByIdAndUpdate(req.params.id, {
      date, studentName, className, course, enrollmentNo,
      fees, total,
      amountInWords: amountInWords || numberToWords(total),
      updatedAt: Date.now()
    });
    req.flash('success', 'Receipt updated.');
    res.redirect(`/admin/management/receipts/${req.params.id}`);
  } catch (err) {
    req.flash('error', 'Update failed.');
    res.redirect(`/admin/management/receipts/${req.params.id}/edit`);
  }
});

// DELETE
router.delete('/management/receipts/:id', requireAuth, async (req, res) => {
  try {
    await FeeReceipt.findByIdAndDelete(req.params.id);
    req.flash('success', 'Receipt deleted.');
    res.redirect('/admin/management/receipts');
  } catch (err) {
    req.flash('error', 'Delete failed.');
    res.redirect('/admin/management/receipts');
  }
});

// ── BONAFIDE CERTIFICATES ─────────────────────────────────────────────────

// LIST
router.get('/management/bonafides', requireAuth, async (req, res) => {
  try {
    const { q } = req.query;
    const filter = q ? { studentName: { $regex: q, $options: 'i' } } : {};
    const bonafides = await Bonafide.find(filter).sort({ serialNo: -1 }).lean();
    res.render('admin/bonafides', {
      title: 'Bonafide Certificates — Admin',
      bonafides, q: q || '',
      adminName: req.session.adminName
    });
  } catch (err) {
    req.flash('error', 'Failed to load.');
    res.redirect('/admin/management');
  }
});

// NEW FORM
router.get('/management/bonafides/new', requireAuth, (req, res) => {
  res.render('admin/bonafide-form', {
    title: 'New Bonafide Certificate — Admin',
    record: null,
    adminName: req.session.adminName
  });
});

// CREATE
router.post('/management/bonafides', requireAuth, async (req, res) => {
  try {
    const last = await Bonafide.findOne().sort({ serialNo: -1 }).lean();
    const serialNo = last && last.serialNo ? last.serialNo + 1 : 1;
    const { date, studentName, yearOfStudy, course, academicYearFrom, academicYearTo,
            dobDay, dobMonth, dobYear, issueDate, yearSuffix } = req.body;

    const b = await Bonafide.create({
      serialNo, yearSuffix: yearSuffix || new Date().getFullYear().toString().slice(-1),
      date, studentName, yearOfStudy, course,
      academicYearFrom, academicYearTo,
      dobDay, dobMonth, dobYear, issueDate
    });
    req.flash('success', `Bonafide #${serialNo} created for ${studentName}.`);
    res.redirect(`/admin/management/bonafides/${b._id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to create bonafide certificate.');
    res.redirect('/admin/management/bonafides/new');
  }
});

// VIEW
router.get('/management/bonafides/:id', requireAuth, async (req, res) => {
  try {
    const record = await Bonafide.findById(req.params.id).lean();
    if (!record) { req.flash('error', 'Not found.'); return res.redirect('/admin/management/bonafides'); }
    res.render('admin/bonafide-detail', {
      title: `Bonafide #${record.serialNo} — Admin`,
      record,
      adminName: req.session.adminName
    });
  } catch (err) {
    req.flash('error', 'Not found.'); res.redirect('/admin/management/bonafides');
  }
});

// DOWNLOAD PDF
router.get('/management/bonafides/:id/download', requireAuth, async (req, res) => {
  try {
    const record = await Bonafide.findById(req.params.id).lean();
    if (!record) return res.status(404).send('Not found.');
    generateBonafidePDF(record, res);
  } catch (err) {
    res.status(500).send('PDF generation failed.');
  }
});

// EDIT
router.get('/management/bonafides/:id/edit', requireAuth, async (req, res) => {
  try {
    const record = await Bonafide.findById(req.params.id).lean();
    if (!record) { req.flash('error', 'Not found.'); return res.redirect('/admin/management/bonafides'); }
    res.render('admin/bonafide-form', {
      title: `Edit Bonafide #${record.serialNo} — Admin`,
      record,
      adminName: req.session.adminName
    });
  } catch (err) {
    req.flash('error', 'Not found.'); res.redirect('/admin/management/bonafides');
  }
});

// UPDATE
router.put('/management/bonafides/:id', requireAuth, async (req, res) => {
  try {
    const { date, studentName, yearOfStudy, course, academicYearFrom, academicYearTo,
            dobDay, dobMonth, dobYear, issueDate, yearSuffix } = req.body;
    await Bonafide.findByIdAndUpdate(req.params.id, {
      yearSuffix, date, studentName, yearOfStudy, course,
      academicYearFrom, academicYearTo, dobDay, dobMonth, dobYear, issueDate,
      updatedAt: Date.now()
    });
    req.flash('success', 'Bonafide certificate updated.');
    res.redirect(`/admin/management/bonafides/${req.params.id}`);
  } catch (err) {
    req.flash('error', 'Update failed.');
    res.redirect(`/admin/management/bonafides/${req.params.id}/edit`);
  }
});

// DELETE
router.delete('/management/bonafides/:id', requireAuth, async (req, res) => {
  try {
    await Bonafide.findByIdAndDelete(req.params.id);
    req.flash('success', 'Bonafide certificate deleted.');
    res.redirect('/admin/management/bonafides');
  } catch (err) {
    req.flash('error', 'Delete failed.');
    res.redirect('/admin/management/bonafides');
  }
});


// ══════════════════════════════════════════════════════════════════════════
// ── ALUMNI ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

const ALUMNI_DEPTS = ['Electrical Engineering','Computer Engineering','AI & Machine Learning','Electronics & Communication'];

// LIST
router.get('/alumni', requireAuth, async (req, res) => {
  try {
    const { dept, year } = req.query;
    const filter = {};
    if (dept && dept !== 'All') filter.department = dept;
    if (year && year !== 'All') filter.passOutYear = parseInt(year);

    const alumni = await Alumni.find(filter).sort({ passOutYear: -1, order: 1, name: 1 }).lean();

    // Get unique years for filter dropdown
    const years = await Alumni.distinct('passOutYear');
    years.sort((a, b) => b - a);

    // Group by year then department for display
    const grouped = {};
    alumni.forEach(a => {
      const y = a.passOutYear;
      if (!grouped[y]) grouped[y] = {};
      if (!grouped[y][a.department]) grouped[y][a.department] = [];
      grouped[y][a.department].push(a);
    });

    res.render('admin/alumni', {
      title: 'Alumni — Admin',
      alumni, grouped, years, ALUMNI_DEPTS,
      activeDept: dept || 'All',
      activeYear: year || 'All',
      adminName: req.session.adminName
    });
  } catch (err) {
    req.flash('error', 'Failed to load alumni.');
    res.redirect('/admin/dashboard');
  }
});

// NEW FORM
router.get('/alumni/new', requireAuth, (req, res) => {
  res.render('admin/alumni-form', {
    title: 'Add Alumni — Admin',
    alumni: null,
    ALUMNI_DEPTS,
    prefillDept: req.query.dept || '',
    prefillYear: req.query.year || '',
    adminName: req.session.adminName
  });
});

// CREATE
router.post('/alumni', requireAuth, (req, res) => {
  uploadAlumni.single('photo')(req, res, async (err) => {
    if (err) { req.flash('error', err.message); return res.redirect('/admin/alumni/new'); }
    try {
      const { name, department, enrollmentNo, passOutYear, statusType,
              companyName, jobRole, collegeName, courseName, otherStatus,
              message, isFeatured, order } = req.body;
      await Alumni.create({
        name, department, enrollmentNo,
        passOutYear: parseInt(passOutYear),
        statusType,
        companyName: companyName || '',
        jobRole: jobRole || '',
        collegeName: collegeName || '',
        courseName: courseName || '',
        otherStatus: otherStatus || '',
        message: message || '',
        isFeatured: isFeatured !== 'false',
        order: parseInt(order) || 0,
        imageUrl:      req.file ? req.file.path     : null,
        imagePublicId: req.file ? req.file.filename : null,
      });
      req.flash('success', `${name} added to alumni!`);
      res.redirect('/admin/alumni');
    } catch (e) {
      req.flash('error', 'Failed to add alumni. Check all fields.');
      res.redirect('/admin/alumni/new');
    }
  });
});

// EDIT FORM
router.get('/alumni/:id/edit', requireAuth, async (req, res) => {
  try {
    const alumni = await Alumni.findById(req.params.id).lean();
    if (!alumni) { req.flash('error', 'Alumni not found.'); return res.redirect('/admin/alumni'); }
    res.render('admin/alumni-form', {
      title: `Edit Alumni — ${alumni.name}`,
      alumni, ALUMNI_DEPTS,
      prefillDept: '', prefillYear: '',
      adminName: req.session.adminName
    });
  } catch (err) {
    req.flash('error', 'Not found.');
    res.redirect('/admin/alumni');
  }
});

// UPDATE
router.put('/alumni/:id', requireAuth, (req, res) => {
  uploadAlumni.single('photo')(req, res, async (err) => {
    if (err) { req.flash('error', err.message); return res.redirect(`/admin/alumni/${req.params.id}/edit`); }
    try {
      const existing = await Alumni.findById(req.params.id);
      if (!existing) { req.flash('error', 'Not found.'); return res.redirect('/admin/alumni'); }

      const { name, department, enrollmentNo, passOutYear, statusType,
              companyName, jobRole, collegeName, courseName, otherStatus,
              message, isFeatured, order } = req.body;

      const update = {
        name, department, enrollmentNo,
        passOutYear: parseInt(passOutYear),
        statusType,
        companyName: companyName || '',
        jobRole: jobRole || '',
        collegeName: collegeName || '',
        courseName: courseName || '',
        otherStatus: otherStatus || '',
        message: message || '',
        isFeatured: isFeatured !== 'false',
        order: parseInt(order) || 0,
        updatedAt: Date.now()
      };

      if (req.file) {
        if (existing.imagePublicId) {
          try { await cloudinary.uploader.destroy(existing.imagePublicId); } catch(e) {}
        }
        update.imageUrl      = req.file.path;
        update.imagePublicId = req.file.filename;
      }

      await Alumni.findByIdAndUpdate(req.params.id, update);
      req.flash('success', `${name} updated!`);
      res.redirect('/admin/alumni');
    } catch (e) {
      req.flash('error', 'Update failed.');
      res.redirect(`/admin/alumni/${req.params.id}/edit`);
    }
  });
});

// DELETE
router.delete('/alumni/:id', requireAuth, async (req, res) => {
  try {
    const a = await Alumni.findById(req.params.id);
    if (!a) { req.flash('error', 'Not found.'); return res.redirect('/admin/alumni'); }
    if (a.imagePublicId) {
      try { await cloudinary.uploader.destroy(a.imagePublicId); } catch(e) {}
    }
    await Alumni.findByIdAndDelete(req.params.id);
    req.flash('success', `${a.name} removed from alumni.`);
    res.redirect('/admin/alumni');
  } catch (err) {
    req.flash('error', 'Delete failed.');
    res.redirect('/admin/alumni');
  }
});


module.exports = router;