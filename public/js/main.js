// ─── HAMBURGER ────────────────────────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobileNav');
if (hamburger && mobileNav) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    mobileNav.classList.toggle('open');
  });
}

// ─── BACK TO TOP ──────────────────────────────────────────────────────────
const backTop = document.getElementById('backTop');
if (backTop) {
  window.addEventListener('scroll', () => {
    backTop.classList.toggle('visible', window.scrollY > 400);
    // Active nav highlight
    const sections = document.querySelectorAll('section[id], div[id]');
    let cur = '';
    sections.forEach(s => { if (window.scrollY >= s.offsetTop - 120) cur = s.id; });
    document.querySelectorAll('nav ul li a').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + cur);
    });
  });
}

// ─── FADE IN OBSERVER ─────────────────────────────────────────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('visible'), i * 80);
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// ─── COUNTER ANIMATION ────────────────────────────────────────────────────
const countObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting && !e.target.counted) {
      e.target.counted = true;
      const target = +e.target.dataset.target;
      let count = 0;
      const inc = target / 60;
      const timer = setInterval(() => {
        count = Math.min(count + inc, target);
        e.target.textContent = Math.round(count) + (target >= 10 ? '+' : '');
        if (count >= target) clearInterval(timer);
      }, 25);
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('[data-target]').forEach(el => countObserver.observe(el));

// ─── GALLERY FILTER ───────────────────────────────────────────────────────
function filterGallery(cat, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.gallery-item').forEach(item => {
    const itemCat = (item.dataset.cat || '').toLowerCase();
    const show    = cat === 'all' || itemCat === cat.toLowerCase();
    item.style.display = show ? 'block' : 'none';
    if (show) item.style.animation = 'fadeIn 0.4s ease';
  });
}

// ─── MODAL HELPERS ────────────────────────────────────────────────────────
function openModal(title, text) {
  const modal = document.getElementById('modal');
  if (!modal) return;
  if (title) document.getElementById('modalTitle').textContent = title;
  if (text) document.getElementById('modalText').textContent = text;
  modal.classList.add('open');
  // Auto close after 5s
  setTimeout(() => modal.classList.remove('open'), 5000);
}
function closeModal() {
  const modal = document.getElementById('modal');
  if (modal) modal.classList.remove('open');
}

const modalEl = document.getElementById('modal');
if (modalEl) {
  modalEl.addEventListener('click', e => { if (e.target === modalEl) closeModal(); });
}

// ─── ADMISSION FORM SUBMISSION (AJAX) ─────────────────────────────────────
const admissionForm = document.getElementById('admissionForm');
if (admissionForm) {
  admissionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('enquirySubmitBtn');
    btn.textContent = 'Submitting...';
    btn.disabled = true;

    const formData = new FormData(admissionForm);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.success) {
        openModal('Enquiry Submitted! 🎓', result.message);
        admissionForm.reset();
      } else {
        openModal('Error ⚠️', result.message || 'Something went wrong.');
      }
    } catch (err) {
      openModal('Error ⚠️', 'Network error. Please try again.');
    } finally {
      btn.textContent = 'Submit Enquiry →';
      btn.disabled = false;
    }
  });
}

// ─── CONTACT FORM SUBMISSION (AJAX) ───────────────────────────────────────
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = contactForm.querySelector('.submit-btn');
    btn.textContent = 'Sending...';
    btn.disabled = true;

    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.success) {
        openModal('Message Sent! ✉️', result.message);
        contactForm.reset();
      } else {
        openModal('Error ⚠️', result.message || 'Something went wrong.');
      }
    } catch (err) {
      openModal('Error ⚠️', 'Network error. Please try again.');
    } finally {
      btn.textContent = 'Send Message →';
      btn.disabled = false;
    }
  });
}

// ─── AUTO-DISMISS FLASH MESSAGES ──────────────────────────────────────────
const flashMsg = document.getElementById('flashMsg');
if (flashMsg) {
  setTimeout(() => {
    flashMsg.style.transition = 'opacity .5s';
    flashMsg.style.opacity = '0';
    setTimeout(() => flashMsg.remove(), 500);
  }, 4000);
}
