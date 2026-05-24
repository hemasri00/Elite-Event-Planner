import os
from dotenv import load_dotenv

# Load local .env file if present (useful for local development)
load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'elite-event-planner-super-secret-key-19385')
    
    # Database config with fallback for local testing
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    if not SQLALCHEMY_DATABASE_URI:
        # Fallback to local SQLite database so the app can be run immediately
        SQLALCHEMY_DATABASE_URI = 'sqlite:///elite_event_planner.db'
    elif SQLALCHEMY_DATABASE_URI.startswith("postgres://"):
        # Neon/Render sometimes uses postgres://, SQLAlchemy 1.4+ requires postgresql://
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace("postgres://", "postgresql://", 1)
        
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Mail configurations
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True').lower() in ['true', '1', 'yes', 'y', 't']
    MAIL_USE_SSL = os.environ.get('MAIL_USE_SSL', 'False').lower() in ['true', '1', 'yes', 'y', 't']
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', os.environ.get('MAIL_USERNAME'))
    
    # Admin receiver email
    ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@eliteeventplanner.com')
