/* ========================================================
   ELITE EVENT PLANNER - MAIN FRONTEND MOTOR
   ======================================================== */

// Configure API base dynamically
const isLocalHost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' || 
                    window.location.hostname.startsWith('192.168.') || 
                    window.location.hostname.startsWith('10.') || 
                    window.location.hostname.startsWith('172.') ||
                    window.location.port !== '';

const API_BASE = isLocalHost 
    ? '' 
    : (window.location.protocol === 'file:' ? 'http://127.0.0.1:5000' : 'https://elite-event-planner.onrender.com');

document.addEventListener('DOMContentLoaded', () => {
    // 1. Dismiss Page Loader
    const loader = document.getElementById('loader');
    if (loader) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                loader.style.opacity = '0';
                loader.style.visibility = 'hidden';
            }, 600);
        });
        // Safety timeout in case window load event already fired
        setTimeout(() => {
            loader.style.opacity = '0';
            loader.style.visibility = 'hidden';
        }, 2000);
    }

    // 2. Navbar Scrolled styling
    const navbar = document.querySelector('.navbar-custom');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // 3. Scroll to Top Button
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    if (scrollTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 400) {
                scrollTopBtn.classList.add('show');
            } else {
                scrollTopBtn.classList.remove('show');
            }
        });

        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // 4. Hero Slider System (Home Page)
    initHeroSlider();

    // 5. Load dynamic services (Services Page)
    if (document.getElementById('services-grid')) {
        loadServices();
    }

    // 6. Load dynamic events (Events Page)
    if (document.getElementById('events-grid')) {
        loadEvents();
    }

    // 7. Contact Form Handler (Contact Page)
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmit);
    }

    // 8. Booking Form Handler (Booking Page)
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        // Pre-fill query parameters if any (e.g. from service or event "Book Now" buttons)
        const urlParams = new URLSearchParams(window.location.search);
        const eventType = urlParams.get('type');
        if (eventType) {
            const selectEvent = document.getElementById('event_type');
            if (selectEvent) {
                // Find matching option
                for (let i = 0; i < selectEvent.options.length; i++) {
                    if (selectEvent.options[i].value.toLowerCase().includes(eventType.toLowerCase())) {
                        selectEvent.selectedIndex = i;
                        break;
                    }
                }
            }
        }
        bookingForm.addEventListener('submit', handleBookingSubmit);
    }
});

/* ========================================================
   TOAST NOTIFICATION ENGINE
   ======================================================= */
function showToast(message, type = 'info') {
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    
    let iconClass = 'bi-info-circle-fill';
    if (type === 'success') iconClass = 'bi-check-circle-fill';
    if (type === 'error') iconClass = 'bi-exclamation-triangle-fill';

    toast.innerHTML = `
        <div class="d-flex align-items-center gap-2">
            <i class="bi ${iconClass} fs-5"></i>
            <span>${message}</span>
        </div>
        <button type="button" class="btn-close btn-close-white ms-3" aria-label="Close"></button>
    `;

    toastContainer.appendChild(toast);

    // Close button event listener
    toast.querySelector('.btn-close').addEventListener('click', () => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    });

    // Auto dismiss
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }
    }, 4500);
}

/* ========================================================
   HERO BACKGROUND SLIDER SYSTEM
   ======================================================= */
function initHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    if (slides.length === 0) return;

    let currentSlide = 0;
    const slideInterval = 5000; // 5 seconds per slide

    function nextSlide() {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }

    // Set first slide active
    slides[0].classList.add('active');

    // Run interval
    setInterval(nextSlide, slideInterval);
}

/* ========================================================
   SERVICES LOADER & FILTERING
   ======================================================= */
let cachedServices = [];
async function loadServices() {
    const servicesGrid = document.getElementById('services-grid');
    if (!servicesGrid) return;

    try {
        servicesGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2 text-muted">Curating our premium services...</p>
            </div>
        `;

        const response = await fetch(`${API_BASE}/api/services`);
        if (!response.ok) throw new Error('Failed to retrieve services.');

        cachedServices = await response.json();
        renderServices(cachedServices);

        // Bind filter search input
        const searchInput = document.getElementById('service-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const filtered = cachedServices.filter(s => 
                    s.title.toLowerCase().includes(query) || 
                    s.description.toLowerCase().includes(query)
                );
                renderServices(filtered);
            });
        }

    } catch (error) {
        console.error(error);
        servicesGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-exclamation-octagon text-danger fs-1"></i>
                <p class="mt-2 text-muted">Unable to load services at this time. Please try again later.</p>
            </div>
        `;
    }
}

function renderServices(services) {
    const servicesGrid = document.getElementById('services-grid');
    if (!servicesGrid) return;

    if (services.length === 0) {
        servicesGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-search fs-2 text-muted"></i>
                <p class="mt-2 text-muted">No matching services found.</p>
            </div>
        `;
        return;
    }

    servicesGrid.innerHTML = services.map(s => `
        <div class="col-md-6 col-lg-3 mb-4" data-aos="fade-up">
            <div class="card card-elite h-100">
                <div class="card-elite-img-wrapper">
                    <span class="card-badge">$${s.price_estimate.toLocaleString()} est</span>
                    <img src="${s.image_url}" class="card-elite-img" alt="${s.title}">
                    <div class="card-elite-overlay">
                        <a href="/booking?type=${encodeURIComponent(s.title)}" class="btn btn-sm btn-elite w-100">Book Service</a>
                    </div>
                </div>
                <div class="card-body d-flex flex-column p-4">
                    <h5 class="card-title fw-bold mb-2">${s.title}</h5>
                    <p class="card-text text-muted small flex-grow-1">${s.description}</p>
                    <hr class="text-black-50 my-3">
                    <div class="d-flex align-items-center justify-content-between">
                        <span class="text-primary fw-semibold small">Est: $${s.price_estimate.toLocaleString()}</span>
                        <a href="/booking?type=${encodeURIComponent(s.title)}" class="btn btn-sm btn-outline-primary rounded-pill px-3">Book Now</a>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

/* ========================================================
   EVENTS LOADER
   ======================================================= */
async function loadEvents() {
    const eventsGrid = document.getElementById('events-grid');
    if (!eventsGrid) return;

    try {
        eventsGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2 text-muted">Designing premium event themes...</p>
            </div>
        `;

        const response = await fetch(`${API_BASE}/api/events`);
        if (!response.ok) throw new Error('Failed to retrieve events.');

        const events = await response.json();
        
        eventsGrid.innerHTML = events.map(e => `
            <div class="col-md-6 col-lg-3 mb-4" data-aos="fade-up">
                <div class="card card-elite h-100">
                    <div class="card-elite-img-wrapper">
                        <span class="card-badge">Starts at $${e.starting_price.toLocaleString()}</span>
                        <img src="${e.image_url}" class="card-elite-img" alt="${e.title}">
                        <div class="card-elite-overlay">
                            <a href="/booking?type=${encodeURIComponent(e.title)}" class="btn btn-sm btn-elite w-100">Book Theme</a>
                        </div>
                    </div>
                    <div class="card-body d-flex flex-column p-4">
                        <h5 class="card-title fw-bold mb-2">${e.title}</h5>
                        <p class="card-text text-muted small flex-grow-1">${e.description}</p>
                        <hr class="text-black-50 my-3">
                        <div class="d-flex align-items-center justify-content-between mt-auto">
                            <span class="text-secondary fw-semibold small">From $${e.starting_price.toLocaleString()}</span>
                            <a href="/booking?type=${encodeURIComponent(e.title)}" class="btn btn-sm btn-elite">Book Now</a>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error(error);
        eventsGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-exclamation-octagon text-danger fs-1"></i>
                <p class="mt-2 text-muted">Unable to load event packages. Please try again later.</p>
            </div>
        `;
    }
}

/* ========================================================
   CONTACT FORM DISPATCHER
   ======================================================= */
async function handleContactSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    
    try {
        btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...`;
        btn.disabled = true;

        const formData = {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            subject: document.getElementById('subject').value.trim(),
            message: document.getElementById('message').value.trim()
        };

        const response = await fetch(`${API_BASE}/api/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
            showToast('Message sent! Our admin has been notified and we will contact you shortly.', 'success');
            contactForm.reset();
        } else {
            showToast(result.message || 'Something went wrong. Please try again.', 'error');
        }

    } catch (error) {
        console.error(error);
        showToast('Network error. Unable to contact server.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

/* ========================================================
   BOOKING FORM DISPATCHER
   ======================================================= */
async function handleBookingSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;

    try {
        btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Securing Slot...`;
        btn.disabled = true;

        const formData = {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            event_type: document.getElementById('event_type').value,
            event_date: document.getElementById('event_date').value,
            guests: document.getElementById('guests').value,
            venue: document.getElementById('venue').value.trim(),
            budget: document.getElementById('budget').value,
            requirements: document.getElementById('requirements').value.trim()
        };

        const response = await fetch(`${API_BASE}/api/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // Trigger beautiful Bootstrap success modal
            const successModal = new bootstrap.Modal(document.getElementById('bookingSuccessModal'));
            successModal.show();
            bookingForm.reset();
            
            // Redirect to user dashboard on modal close or after 4 seconds
            document.getElementById('bookingSuccessModal').addEventListener('hidden.bs.modal', () => {
                window.location.href = '/dashboard';
            });
            setTimeout(() => {
                successModal.hide();
                window.location.href = '/dashboard';
            }, 4000);
        } else {
            showToast(result.message || 'Booking failed. Check details and resubmit.', 'error');
        }

    } catch (error) {
        console.error(error);
        showToast('Network error. Unable to register booking.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
