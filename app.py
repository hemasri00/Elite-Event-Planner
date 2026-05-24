from flask import Flask, send_from_directory
from flask_cors import CORS
from config import Config
from models import db, mail, Service, Event
import os
import sys

def create_app():
    # Set templates and static paths to support standard Flask layout
    app = Flask(
        __name__, 
        static_folder='static',
        template_folder='templates'
    )
    
    # Load configuration
    app.config.from_object(Config)
    
    # Initialize extensions
    db.init_app(app)
    mail.init_app(app)
    
    # Enable CORS for cross-origin deployment (Netlify -> Render)
    CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})
    
    # Register Blueprints
    from routes import pages, api
    app.register_blueprint(pages, url_prefix='/')
    app.register_blueprint(api, url_prefix='/api')
    
    # Handle static assets manually if requested or fallback
    @app.route('/static/<path:filename>')
    def serve_static(filename):
        return send_from_directory(app.static_folder, filename)

    # Initialize Database tables and Seed default data
    with app.app_context():
        try:
            db.create_all()
            seed_data()
        except Exception as e:
            print(f"Database setup error: {str(e)}", file=sys.stderr)
            
    return app

def seed_data():
    """Seeds standard Services and Event Categories if they are empty"""
    
    # Seed Services
    if Service.query.count() == 0:
        default_services = [
            Service(
                title="Decoration",
                description="Elegant and thematic venue decorations, floral arches, and beautiful table layouts.",
                price_estimate=1500.00,
                image_url="https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=800&q=80"
            ),
            Service(
                title="Catering",
                description="Delicious gourmet buffet and fine dining multi-cuisine menus curated by premium chefs.",
                price_estimate=2500.00,
                image_url="https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=800&q=80"
            ),
            Service(
                title="Photography",
                description="Professional high-definition cinematic photography and videography to capture lifetime memories.",
                price_estimate=1200.00,
                image_url="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80"
            ),
            Service(
                title="Makeup Artist",
                description="Professional styling, hair design, and glowing HD bridal & party makeup options.",
                price_estimate=600.00,
                image_url="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80"
            ),
            Service(
                title="DJ & Music",
                description="Top-tier live sound setups, dynamic DJs, custom playlists, and rhythmic dance floors.",
                price_estimate=950.00,
                image_url="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80"
            ),
            Service(
                title="Stage Decoration",
                description="Breathtaking central main stage designs with luxury backdrops and modern setups.",
                price_estimate=2000.00,
                image_url="https://images.unsplash.com/photo-1478812954026-9c750f0e89fc?auto=format&fit=crop&w=800&q=80"
            ),
            Service(
                title="Lighting",
                description="Vibrant ambient uplighting, fairy lights, moving head beam lights, and custom spot displays.",
                price_estimate=800.00,
                image_url="https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?auto=format&fit=crop&w=800&q=80"
            ),
            Service(
                title="Invitation Design",
                description="Custom digital e-invites, standard luxury gold foil cards, and interactive RSVP systems.",
                price_estimate=350.00,
                image_url="https://images.unsplash.com/photo-1516962215378-7fa2e137ae93?auto=format&fit=crop&w=800&q=80"
            )
        ]
        db.session.bulk_save_objects(default_services)
        db.session.commit()
        print("Standard Services seeded successfully!")

    # Seed Event Categories
    if Event.query.count() == 0:
        default_events = [
            Event(
                title="Wedding / Marriage",
                description="Step into your fairytale wedding. From royal venue setup to grand catering and custom wedding coordination.",
                starting_price=9999.00,
                image_url="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80"
            ),
            Event(
                title="Birthday Party",
                description="Vibrant themes, colorful balloon clusters, premium photo-booths, interactive magic shows, and grand cake tables.",
                starting_price=999.00,
                image_url="https://images.unsplash.com/photo-1464349153735-7db50ed83c84?auto=format&fit=crop&w=800&q=80"
            ),
            Event(
                title="Baby Shower",
                description="Warm, gentle themes, custom pastel floral setups, sweet gift tables, and comfortable spaces to celebrate incoming joy.",
                starting_price=1200.00,
                image_url="https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=800&q=80"
            ),
            Event(
                title="Cradle Ceremony",
                description="Beautiful, traditional floral cradle setups with modern standard layouts, customized music, and dining arrangements.",
                starting_price=800.00,
                image_url="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80"
            ),
            Event(
                title="Engagement",
                description="Celebrate your beautiful commitment. Intimate ring ceremony setups, glamorous background designs, and catering excellence.",
                starting_price=2499.00,
                image_url="https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=800&q=80"
            ),
            Event(
                title="Anniversary",
                description="Relive your milestone vows in stunning environments. Elegant dining setups, personalized video screens, and classical music.",
                starting_price=1499.00,
                image_url="https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=800&q=80"
            ),
            Event(
                title="House Warming",
                description="Traditional entrance decorations, fresh mango leaf torans, pristine homam setups, and warm multi-course traditional meals.",
                starting_price=750.00,
                image_url="https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80"
            ),
            Event(
                title="Corporate Events",
                description="State of the art stage, high-definition visual arrays, crystal clear audio, elegant corporate layout, and executive catering.",
                starting_price=4999.00,
                image_url="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80"
            )
        ]
        db.session.bulk_save_objects(default_events)
        db.session.commit()
        print("Standard Event Categories seeded successfully!")

app = create_app()

if __name__ == '__main__':
    # Determine port from env (Render requires PORT env variable)
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
