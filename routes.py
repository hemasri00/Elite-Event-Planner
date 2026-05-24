from flask import Blueprint, render_template, request, jsonify, session, current_app, redirect, url_for
from models import db, mail, User, Booking, Service, Event, Contact
from flask_mail import Message
from datetime import datetime
import json
import logging

# Define blueprints
pages = Blueprint('pages', __name__)
api = Blueprint('api', __name__)

# Initialize logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Helper to send admin notification emails
def send_admin_notification(subject, html_body):
    try:
        admin_email = current_app.config.get('ADMIN_EMAIL')
        if not admin_email:
            logger.warning("ADMIN_EMAIL is not configured. Skipping email send.")
            return False
        
        # Check if mail username is set (to see if mail config is provided)
        if not current_app.config.get('MAIL_USERNAME'):
            logger.warning("Mail username is not configured. Email will not be sent.")
            return False

        msg = Message(
            subject=f"[Elite Event Planner] {subject}",
            recipients=[admin_email],
            html=html_body
        )
        mail.send(msg)
        logger.info(f"Notification email sent successfully for: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return False

# Decorator to check for admin role
def admin_required(f):
    def decorator(*args, **kwargs):
        if session.get('role') != 'admin':
            return jsonify({'success': False, 'message': 'Access denied. Admin privileges required.'}), 403
        return f(*args, **kwargs)
    decorator.__name__ = f.__name__
    return decorator

# Decorator to check for logged-in user
def login_required(f):
    def decorator(*args, **kwargs):
        if not session.get('user_id'):
            return jsonify({'success': False, 'message': 'Authentication required. Please log in.'}), 401
        return f(*args, **kwargs)
    decorator.__name__ = f.__name__
    return decorator


# ========================================================
# HTML PAGE ROUTES
# ========================================================

@pages.route('/')
def index():
    return render_template('index.html')

@pages.route('/about')
def about():
    return render_template('about.html')

@pages.route('/services')
def services():
    return render_template('services.html')

@pages.route('/events')
def events():
    return render_template('events.html')

@pages.route('/contact')
def contact():
    return render_template('contact.html')

@pages.route('/register')
def register():
    # If already logged in, redirect to appropriate dashboard
    if session.get('user_id'):
        if session.get('role') == 'admin':
            return redirect(url_for('pages.admin'))
        return redirect(url_for('pages.dashboard'))
    return render_template('register.html')

@pages.route('/login')
def login():
    if session.get('user_id'):
        if session.get('role') == 'admin':
            return redirect(url_for('pages.admin'))
        return redirect(url_for('pages.dashboard'))
    return render_template('login.html')

@pages.route('/dashboard')
def dashboard():
    if not session.get('user_id'):
        return redirect(url_for('pages.login'))
    if session.get('role') == 'admin':
        return redirect(url_for('pages.admin'))
    return render_template('dashboard.html')

@pages.route('/booking')
def booking():
    return render_template('booking.html')

@pages.route('/admin')
def admin():
    if not session.get('user_id') or session.get('role') != 'admin':
        return redirect(url_for('pages.login'))
    return render_template('admin.html')

@pages.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('pages.login'))


# ========================================================
# REST API ROUTES
# ========================================================

# Get all Services
@api.route('/services', methods=['GET'])
def get_services():
    services_list = Service.query.order_by(Service.id.asc()).all()
    return jsonify([s.to_dict() for s in services_list])

# Get all Event Categories
@api.route('/events', methods=['GET'])
def get_events():
    events_list = Event.query.order_by(Event.id.asc()).all()
    return jsonify([e.to_dict() for e in events_list])

# Register User
@api.route('/auth/register', methods=['POST'])
def register_user():
    try:
        data = request.json or request.form
        name = data.get('name')
        email = data.get('email')
        phone = data.get('phone')
        password = data.get('password')
        confirm_password = data.get('confirm_password')

        # Form validations
        if not all([name, email, phone, password, confirm_password]):
            return jsonify({'success': False, 'message': 'All fields are required.'}), 400
        
        if password != confirm_password:
            return jsonify({'success': False, 'message': 'Passwords do not match.'}), 400
        
        # Check if email exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'success': False, 'message': 'Email address already registered.'}), 400

        # Auto-assign 'admin' role if no users exist or email matches admin format
        num_users = User.query.count()
        role = 'user'
        if num_users == 0 or (email and ('admin@' in email or email == current_app.config.get('ADMIN_EMAIL'))):
            role = 'admin'

        # Create new user
        user = User(name=name, email=email, phone=phone, role=role)
        user.set_password(password)

        db.session.add(user)
        db.session.commit()

        # Send registration details to admin Gmail automatically
        html_content = f"""
        <h3>New User Registered</h3>
        <p>A new client has registered on Elite Event Planner:</p>
        <table border="1" cellpadding="5" style="border-collapse:collapse;">
            <tr><td><b>Full Name</b></td><td>{name}</td></tr>
            <tr><td><b>Email</b></td><td>{email}</td></tr>
            <tr><td><b>Phone Number</b></td><td>{phone}</td></tr>
            <tr><td><b>Assigned Role</b></td><td>{role}</td></tr>
            <tr><td><b>Date Registered</b></td><td>{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</td></tr>
        </table>
        """
        send_admin_notification("New User Registered Successfully", html_content)

        # Automatically log user in
        session['user_id'] = user.id
        session['role'] = user.role
        session['name'] = user.name

        return jsonify({
            'success': True,
            'message': 'Registration successful!',
            'user': user.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error during registration: {str(e)}")
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500

# Login User
@api.route('/auth/login', methods=['POST'])
def login_user():
    try:
        data = request.json or request.form
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({'success': False, 'message': 'Email and password are required.'}), 400

        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return jsonify({'success': False, 'message': 'Invalid email or password.'}), 401

        # Establish secure Flask session
        session['user_id'] = user.id
        session['role'] = user.role
        session['name'] = user.name

        return jsonify({
            'success': True,
            'message': 'Login successful!',
            'user': user.to_dict()
        })

    except Exception as e:
        logger.error(f"Error during login: {str(e)}")
        return jsonify({'success': False, 'message': 'Server error.'}), 500

# Logout User
@api.route('/auth/logout', methods=['POST', 'GET'])
def logout_user():
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully.'})

# Check current active session
@api.route('/auth/session', methods=['GET'])
def get_session():
    if not session.get('user_id'):
        return jsonify({'success': False, 'message': 'No active session.'}), 401
    
    user = User.query.get(session['user_id'])
    if not user:
        session.clear()
        return jsonify({'success': False, 'message': 'User not found.'}), 401
        
    return jsonify({
        'success': True,
        'user': user.to_dict()
    })

# Book an Event
@api.route('/bookings', methods=['POST'])
def create_booking():
    try:
        data = request.json or request.form
        name = data.get('name')
        email = data.get('email')
        phone = data.get('phone')
        event_type = data.get('event_type')
        event_date_str = data.get('event_date')
        guests = data.get('guests')
        venue = data.get('venue')
        budget = data.get('budget')
        requirements = data.get('requirements')

        if not all([name, email, phone, event_type, event_date_str, guests, venue, budget]):
            return jsonify({'success': False, 'message': 'All required fields must be filled.'}), 400

        # Parse variables
        try:
            event_date = datetime.strptime(event_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid date format. Use YYYY-MM-DD.'}), 400
        
        try:
            guests = int(guests)
            if guests <= 0: raise ValueError
        except ValueError:
            return jsonify({'success': False, 'message': 'Guest count must be a positive integer.'}), 400
        
        try:
            budget = float(budget)
            if budget <= 0: raise ValueError
        except ValueError:
            return jsonify({'success': False, 'message': 'Budget must be a positive number.'}), 400

        # User association if logged in
        user_id = session.get('user_id')

        # Create Booking
        booking = Booking(
            user_id=user_id,
            name=name,
            email=email,
            phone=phone,
            event_type=event_type,
            event_date=event_date,
            guests=guests,
            venue=venue,
            budget=budget,
            requirements=requirements
        )

        db.session.add(booking)
        db.session.commit()

        # Send booking details email to Admin automatically
        html_content = f"""
        <h3>New Event Booking Request</h3>
        <p>A new event has been booked on Elite Event Planner:</p>
        <table border="1" cellpadding="5" style="border-collapse:collapse;">
            <tr><td><b>Customer Name</b></td><td>{name}</td></tr>
            <tr><td><b>Email</b></td><td>{email}</td></tr>
            <tr><td><b>Phone</b></td><td>{phone}</td></tr>
            <tr><td><b>Event Type</b></td><td>{event_type}</td></tr>
            <tr><td><b>Event Date</b></td><td>{event_date_str}</td></tr>
            <tr><td><b>Guests Count</b></td><td>{guests}</td></tr>
            <tr><td><b>Venue Location</b></td><td>{venue}</td></tr>
            <tr><td><b>Estimated Budget</b></td><td>${budget:,.2f}</td></tr>
            <tr><td><b>Additional Requirements</b></td><td>{requirements or 'None'}</td></tr>
            <tr><td><b>Booking Date</b></td><td>{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</td></tr>
        </table>
        """
        send_admin_notification(f"New Booking Alert - {event_type}", html_content)

        return jsonify({
            'success': True,
            'message': 'Booking successful!',
            'booking': booking.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating booking: {str(e)}")
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500

# Get Current User's Bookings
@api.route('/user/bookings', methods=['GET'])
@login_required
def get_user_bookings():
    user_id = session['user_id']
    user_bookings = Booking.query.filter_by(user_id=user_id).order_by(Booking.event_date.asc()).all()
    return jsonify([b.to_dict() for b in user_bookings])

# Contact Form Submission
@api.route('/contact', methods=['POST'])
def submit_contact():
    try:
        data = request.json or request.form
        name = data.get('name')
        email = data.get('email')
        phone = data.get('phone')
        subject = data.get('subject')
        message = data.get('message')

        if not all([name, email, subject, message]):
            return jsonify({'success': False, 'message': 'Name, email, subject, and message are required.'}), 400

        contact = Contact(
            name=name,
            email=email,
            phone=phone,
            subject=subject,
            message=message
        )
        db.session.add(contact)
        db.session.commit()

        # Send contact message to admin automatically
        html_content = f"""
        <h3>New Contact Message Submitted</h3>
        <p>A user submitted a contact form message:</p>
        <table border="1" cellpadding="5" style="border-collapse:collapse;">
            <tr><td><b>Sender Name</b></td><td>{name}</td></tr>
            <tr><td><b>Email</b></td><td>{email}</td></tr>
            <tr><td><b>Phone</b></td><td>{phone or 'Not provided'}</td></tr>
            <tr><td><b>Subject</b></td><td>{subject}</td></tr>
            <tr><td><b>Message</b></td><td>{message}</td></tr>
            <tr><td><b>Time Submitted</b></td><td>{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</td></tr>
        </table>
        """
        send_admin_notification(f"Contact Form Inquiry: {subject}", html_content)

        return jsonify({'success': True, 'message': 'Message sent successfully!'}), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error submitting contact form: {str(e)}")
        return jsonify({'success': False, 'message': 'Server error.'}), 500


# ========================================================
# ADMIN DASHBOARD ENDPOINTS
# ========================================================

# Get Statistics
@api.route('/admin/stats', methods=['GET'])
@login_required
@admin_required
def get_admin_stats():
    try:
        total_bookings = Booking.query.count()
        total_users = User.query.count()
        
        # Calculate revenue from Confirmed bookings
        confirmed_bookings_list = Booking.query.filter_by(status='Confirmed').all()
        total_revenue = sum(float(b.budget) for b in confirmed_bookings_list)
        
        pending_bookings = Booking.query.filter_by(status='Pending').count()
        confirmed_bookings = len(confirmed_bookings_list)
        cancelled_bookings = Booking.query.filter_by(status='Cancelled').count()
        total_contacts = Contact.query.count()

        return jsonify({
            'success': True,
            'stats': {
                'total_bookings': total_bookings,
                'total_users': total_users,
                'total_revenue': total_revenue,
                'pending_bookings': pending_bookings,
                'confirmed_bookings': confirmed_bookings,
                'cancelled_bookings': cancelled_bookings,
                'total_contacts': total_contacts
            }
        })
    except Exception as e:
        logger.error(f"Error getting admin statistics: {str(e)}")
        return jsonify({'success': False, 'message': 'Server error.'}), 500

# Get all Users
@api.route('/admin/users', methods=['GET'])
@login_required
@admin_required
def get_all_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users])

# Get all Bookings
@api.route('/admin/bookings', methods=['GET'])
@login_required
@admin_required
def get_all_bookings():
    bookings = Booking.query.order_by(Booking.created_at.desc()).all()
    return jsonify([b.to_dict() for b in bookings])

# Update Booking Status
@api.route('/admin/bookings/<int:booking_id>/status', methods=['POST'])
@login_required
@admin_required
def update_booking_status(booking_id):
    try:
        data = request.json or {}
        new_status = data.get('status')
        
        if new_status not in ['Pending', 'Confirmed', 'Cancelled']:
            return jsonify({'success': False, 'message': 'Invalid status choice.'}), 400

        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({'success': False, 'message': 'Booking not found.'}), 404

        booking.status = new_status
        db.session.commit()

        # Send a confirmation email to the user if status changes (optional positive UX)
        # Note: In production we could send a mail here too.
        
        return jsonify({
            'success': True, 
            'message': f'Booking status updated to {new_status}!',
            'booking': booking.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating booking status: {str(e)}")
        return jsonify({'success': False, 'message': 'Server error.'}), 500

# Delete Booking
@api.route('/admin/bookings/<int:booking_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_booking(booking_id):
    try:
        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({'success': False, 'message': 'Booking not found.'}), 404

        db.session.delete(booking)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Booking deleted successfully!'})

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting booking: {str(e)}")
        return jsonify({'success': False, 'message': 'Server error.'}), 500

# Add/Manage Service dynamically (Admin capability)
@api.route('/admin/services', methods=['POST'])
@login_required
@admin_required
def add_service():
    try:
        data = request.json or request.form
        title = data.get('title')
        description = data.get('description')
        price_estimate = data.get('price_estimate')
        image_url = data.get('image_url')

        if not all([title, description, price_estimate, image_url]):
            return jsonify({'success': False, 'message': 'All fields are required.'}), 400

        service = Service(
            title=title,
            description=description,
            price_estimate=float(price_estimate),
            image_url=image_url
        )
        db.session.add(service)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Service added successfully!', 'service': service.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500

# Add/Manage Event dynamic categories (Admin capability)
@api.route('/admin/events', methods=['POST'])
@login_required
@admin_required
def add_event():
    try:
        data = request.json or request.form
        title = data.get('title')
        description = data.get('description')
        starting_price = data.get('starting_price')
        image_url = data.get('image_url')

        if not all([title, description, starting_price, image_url]):
            return jsonify({'success': False, 'message': 'All fields are required.'}), 400

        event = Event(
            title=title,
            description=description,
            starting_price=float(starting_price),
            image_url=image_url
        )
        db.session.add(event)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Event category added successfully!', 'event': event.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500
