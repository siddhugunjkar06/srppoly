const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Images: Faculty ────────────────────────────────────────────────────────
const uploadFaculty = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'srpp-college/faculty',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, f, cb) => f.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Images only')),
});

// ── Images: Gallery ────────────────────────────────────────────────────────
const uploadGallery = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'srpp-college/gallery',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_, f, cb) => f.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Images only')),
});

// ── PDF upload middleware ──────────────────────────────────────────────────
// memoryStorage -> upload_stream to Cloudinary (resource_type: raw)
// Sets on req.file after upload:
//   req.file.cloudinaryUrl      = result.secure_url   (store as pdfUrl in DB)
//   req.file.cloudinaryPublicId = result.public_id    (store as pdfPublicId in DB)
function makePDFUpload(folder) {
  const mem = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_, f, cb) => f.mimetype === 'application/pdf' ? cb(null, true) : cb(new Error('PDF only')),
  });

  return (req, res, next) => {
    mem.single('pdf')(req, res, async (err) => {
      if (err) return next(err);
      if (!req.file) return next();

      const safeName = req.file.originalname
        .replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
      const publicId = folder + '/' + safeName + '_' + Date.now();

      try {
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { resource_type: 'raw', public_id: publicId },
            (error, r) => error ? reject(error) : resolve(r)
          ).end(req.file.buffer);
        });

        console.log('[PDF uploaded]', result.public_id, result.secure_url);
        req.file.cloudinaryUrl      = result.secure_url;
        req.file.cloudinaryPublicId = result.public_id;
        next();
      } catch (e) {
        console.error('[PDF upload failed]', e.message);
        next(new Error('PDF upload failed: ' + e.message));
      }
    });
  };
}

async function destroyPDF(publicId) {
  if (!publicId) return;
  try {
    const r = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    console.log('[PDF deleted]', publicId, r.result);
  } catch (e) {
    console.warn('[PDF delete failed]', publicId, e.message);
  }
}

const uploadGrievancePDF = makePDFUpload('srpp-college/grievances');
const uploadSyllabusPDF  = makePDFUpload('srpp-college/syllabus');
const uploadLabManualPDF = makePDFUpload('srpp-college/lab-manuals');

module.exports = { cloudinary, uploadFaculty, uploadGallery, uploadGrievancePDF, uploadSyllabusPDF, uploadLabManualPDF, destroyPDF };
