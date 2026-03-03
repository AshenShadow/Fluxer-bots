from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent

# Load from environment (or .env if using python-dotenv)
FLUXER_CLIENT_ID = os.environ.get('FLUXER_CLIENT_ID', '1473229591074357261')
FLUXER_CLIENT_SECRET = os.environ.get('FLUXER_CLIENT_SECRET', 'cmWI5AEQXofjoUQHUD2DGokADKsgcc1YOkFMbPjeuXk')

SECRET_KEY = 'django-insecure-mp(v$cp^9y)*a=ce6wi0=640^&21tdqa2isc_*0xc^2+(k&zy^'

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    # Third-party
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'corsheaders',
    # Local
    'jesters',
    'users',
]

SITE_ID = 1

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'allauth.account.middleware.AccountMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'jester_web.urls'

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

WSGI_APPLICATION = 'jester_web.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ── CORS (allow Vite dev server) ────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]
CORS_ALLOW_CREDENTIALS = True  # Required for session cookies

# ── Sessions (secure, HttpOnly) ─────────────────────────────────────────────
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_AGE = 60 * 60 * 24 * 7  # 1 week

# ── CSRF ────────────────────────────────────────────────────────────────────
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]

# ── Allauth ──────────────────────────────────────────────────────────────────
AUTHENTICATION_BACKENDS = [
    'allauth.account.auth_backends.AuthenticationBackend',
]

LOGIN_REDIRECT_URL = '/profile/'
ACCOUNT_DEFAULT_HTTP_PROTOCOL = 'http'

SOCIALACCOUNT_PROVIDERS = {
    'fluxer': {
        'APP': {
            'client_id': FLUXER_CLIENT_ID,
            'secret': FLUXER_CLIENT_SECRET,
            'key': '',
        },
        'SCOPE': ['identify'],
    }
}

# Register the custom Fluxer provider with allauth
SOCIALACCOUNT_LOGIN_ON_GET = True  # Skip the "are you sure?" confirmation page
SOCIALACCOUNT_ADAPTER = 'allauth.socialaccount.adapter.DefaultSocialAccountAdapter'
