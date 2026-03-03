from django.urls import path
from .views import login_view, profile_view, logout_view
from .views import oauth2_login, oauth2_callback

urlpatterns = [
    # OAuth2 flow (allauth)
    path('login/callback/', oauth2_callback, name='fluxer_callback'),
    path('login/redirect/', oauth2_login, name='fluxer_oauth_start'),
]
