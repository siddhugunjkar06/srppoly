require('dotenv').config();
const mongoose  = require('mongoose');
const Admin     = require('./models/Admin');
const Notice    = require('./models/Notice');
const Grievance = require('./models/Grievance');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/srpp_college');
  console.log('Connected to MongoDB');

  // // Create admin user
  // const existing = await Admin.findOne({ username: 'admin' });
  // if (!existing) {
  //   await Admin.create({ username: 'admin', email: 'admin@srpp.edu.in', password: 'srpp@2024', name: 'SRPP Administrator', role: 'admin' });
  //   console.log('✅ Admin user created: admin / srpp@2024');
  // } else {
  //   console.log('ℹ️  Admin user already exists');
  // }

  // Seed sample notices
  const count = await Notice.countDocuments();
  if (count === 0) {
    await Notice.insertMany([
      { title: 'Admissions Open for 2024-25 Academic Year', content: 'Applications are now being accepted for all diploma engineering programs for the 2024-25 academic year. Available seats: Electrical Engineering (60), Computer Engineering (60), AI & Machine Learning (60), Electronics & Communication (30). Apply online or visit the office.', category: 'Admission', isNew: true, isImportant: true },
      { title: 'MSBTE Winter 2023 Examination Results Declared', content: 'The Maharashtra State Board of Technical Education has declared the Winter 2023 examination results. Students can check their results on the official MSBTE website at msbte.org.in using their enrollment number.', category: 'Examination', isNew: true },
      { title: 'Annual Technical Fest — TechVision 2024', content: 'SRPP Polytechnic Institute is proud to announce TechVision 2024, our annual technical festival. Events include project exhibitions, coding competitions, robotics challenge, and industry guest lectures. Registration opens February 1st.', category: 'Event', isNew: true },
      { title: 'Scholarship Applications for Minority Students', content: 'The State Government minority scholarship applications for the academic year 2023-24 are now open. Eligible students can apply through the MahaDBT portal. Last date for submission is January 31, 2024.', category: 'Academic', isImportant: true },
      { title: 'Campus Placement Drive — Top Companies Visiting', content: 'Several top companies including Mahindra, Siemens, L&T, Wipro, and TCS are scheduled to visit our campus for placement drives in March 2024. Final year students are requested to register and prepare their resumes.', category: 'General', isNew: false },
      { title: 'New AI Lab Inaugurated with Modern Equipment', content: 'We are pleased to announce the inauguration of our state-of-the-art AI & Machine Learning laboratory equipped with high-performance GPU workstations, robotics kits, and IoT development boards. The lab is now open for all AI/ML department students.', category: 'Academic' }
    ]);
    console.log('✅ Sample notices created');
  } else {
    console.log('ℹ️  Notices already exist, skipping seed');
  }

  // Seed default grievance cells
  const grievanceCount = await Grievance.countDocuments();
  if (grievanceCount === 0) {
    await Grievance.insertMany([
      { srNo: 1, name: 'Anti-Ragging Cell',                      description: 'Addresses complaints related to ragging and ensures a ragging-free campus environment as per UGC regulations.' },
      { srNo: 2, name: 'SC/ST Redressal Committee',              description: 'Addresses grievances of SC/ST students and staff, ensuring equal opportunity and protection from discrimination.' },
      { srNo: 3, name: 'Gender Sensitization',                   description: 'Promotes gender equality, sensitizes the campus community, and organizes awareness programs.' },
      { srNo: 4, name: "Women's Grievances Redressal Cell",      description: 'Provides a safe platform for women students and staff to report grievances and seek resolution.' },
      { srNo: 5, name: 'Student Grievances Redressal Cell',      description: 'Handles academic and non-academic grievances submitted by students for timely and fair resolution.' },
      { srNo: 6, name: 'Grievances Redressal Committee - GRC',   description: 'The apex body for reviewing and resolving all institutional grievances in accordance with AICTE guidelines.' },
      { srNo: 7, name: 'Anti Harassment Committee',              description: 'Addresses complaints of harassment of any nature within the institute premises and takes appropriate action.' },
    ]);
    console.log('✅ Default grievance cells seeded (7 entries)');
  } else {
    console.log('ℹ️  Grievance cells already exist, skipping seed');
  }

  console.log('\n🎉 Seed complete!');
  console.log('   URL:      http://localhost:3000');
  console.log('   Admin:    http://localhost:3000/admin/login');
  console.log('   Grievances: http://localhost:3000/grievances');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
