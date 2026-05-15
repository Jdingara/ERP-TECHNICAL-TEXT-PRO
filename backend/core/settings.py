# ============================================================
# FILE: core/settings.py
# PURPOSE: Main configuration file for SASI ERP Django backend
#          Controls database, installed apps, security settings
# ============================================================

from pathlib import Path
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Base directory of the project
BASE_DIR = Path(__file__).resolve().parent.parent

# Secret key - loaded from .env file for security
SECRET_KEY = os.getenv('SECRET_KEY', 'change-this-in-production')

# Debug mode - True during development, False in production
DEBUG = os.getenv('DEBUG', 'True') == 'True'

# Allowed hosts - domains that can access this server
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')


# ============================================================
# INSTALLED APPS
# All Django built-in apps + third party + our ERP modules
# ============================================================
INSTALLED_APPS = [
    # Django default apps
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party apps
    'rest_framework',        # Django REST Framework - for building APIs
    'corsheaders',           # CORS - allows React frontend to talk to Django

    # Technical Textile ERP — core modules
    'authentication',        # User login, roles, permissions
    'master_data',           # Company Master (shared)
    'chatbot',               # ERP Chatbot — natural language queries
    'dashboard',             # BI Dashboard

    # Technical Textile specific apps
    'masters',               # Yarn, Product/Design, BOM, Process, Machine, Location, Vendor, Customer
    'purchase',              # Purchase Order, GRN, Lot Creation
    'lot_inventory',         # Lot-wise inventory and stock movements
    'planning',              # Sales Order, Production Order, Daily Planning
    'production_exec',       # Process Entry (core engine), Batch management
    'quality',               # Inspection (Greige/Bare/Finished), QC Dashboard
    'dispatch',              # Dispatch Entry, Challan, Invoice, Barcode/Labels
    'traceability',          # Traceability Search (USP)
    'reports',               # All reports
    'maintenance',           # Machine Maintenance Schedules + Escalation

    # Buying House specific apps
    'product_development',   # Product Development (PD) — Request, Tech Spec, Vendor Assignment, Sampling
    'order_management',      # Customer Orders + Factory Orders + T&A Calendar
    'shipment',              # Pre-Shipment Inspection, Shipments, Costing Sheet
    'bh_finance',            # Sales Invoices, Purchase Invoices, Payments
]


# ============================================================
# MIDDLEWARE
# Code that runs on every request/response
# ============================================================
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',      # Serves React build + static files
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',           # CORS must be before CommonMiddleware
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'authentication.middleware.RolePermissionMiddleware',  # Role-based API blocking
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'


# ============================================================
# DATABASE CONFIGURATION
# Using PostgreSQL for production-grade ERP data storage
# Settings loaded from .env file
# ============================================================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',  # PostgreSQL database
        'NAME': os.getenv('DB_NAME', 'sasi_erp'),
        'USER': os.getenv('DB_USER', 'sasi_erp_user'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'sasi_erp_password'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}


# ============================================================
# REST FRAMEWORK SETTINGS
# Controls how the API behaves
# ============================================================
REST_FRAMEWORK = {
    # All API endpoints require login by default
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    # Return clean error messages
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
}


# ============================================================
# CORS SETTINGS
# Allows React frontend (running on port 3000) to talk to Django (port 8000)
# ============================================================
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',    # React development server
    'http://127.0.0.1:3000',
]
# In production on Render, frontend is served by Django itself so no CORS needed
CORS_ALLOW_ALL_ORIGINS = DEBUG   # Allow all only in dev mode
CORS_ALLOW_CREDENTIALS = True

# ── Session cookie settings ─────────────────────────────────
IS_PRODUCTION = not DEBUG
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE   = IS_PRODUCTION
CSRF_COOKIE_SAMESITE    = 'Lax'
CSRF_COOKIE_SECURE      = IS_PRODUCTION


# ============================================================
# PASSWORD VALIDATION
# Rules for user passwords
# ============================================================
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# ============================================================
# INTERNATIONALIZATION
# ============================================================
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'   # Indian Standard Time
USE_I18N = True
USE_TZ = True


# ============================================================
# STATIC & MEDIA FILES
# ============================================================
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# React frontend build — served by Django in production
FRONTEND_BUILD_DIR = BASE_DIR / 'frontend_build'

# Include the React build's static folder so collectstatic picks it up
STATICFILES_DIRS = [BASE_DIR / 'frontend_build' / 'static']

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'    # Uploaded files (documents, images)

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ============================================================
# EMAIL — Gmail SMTP
# Set EMAIL_HOST_USER and EMAIL_HOST_PASSWORD in .env
# Use a Gmail App Password (not your regular Gmail password)
# ============================================================
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('EMAIL_HOST_USER', 'noreply@meitexz.com')

# Base URL of this server — used in confirmation links sent by email
SITE_BASE_URL = os.getenv('SITE_BASE_URL', 'http://localhost:8000')

# Secret key for calling send-reminders from Windows Task Scheduler (no login)
REMINDER_API_KEY = os.getenv('REMINDER_API_KEY', '')
