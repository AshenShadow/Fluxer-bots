"""
Django template views for the users app.
Handles login redirect, profile page, and logout.
"""
from django.shortcuts import render, redirect
from django.contrib.auth import logout as auth_logout
from allauth.socialaccount.models import SocialAccount
from allauth.socialaccount.providers.oauth2.views import (
    OAuth2LoginView, OAuth2CallbackView,
)

from .provider import FluxerOAuth2Adapter
from jesters.models import Jester

# allauth views (used by users/urls.py)
oauth2_login = OAuth2LoginView.adapter_view(FluxerOAuth2Adapter)
oauth2_callback = OAuth2CallbackView.adapter_view(FluxerOAuth2Adapter)


def _social_account(request):
    """Returns the Fluxer SocialAccount for the session user, or None."""
    if not request.user or not request.user.is_authenticated:
        return None
    try:
        return SocialAccount.objects.get(user=request.user, provider='fluxer')
    except SocialAccount.DoesNotExist:
        return None


def login_view(request):
    """Login page – shows the 'Login with Fluxer' button."""
    if _social_account(request):
        return redirect('profile')
    return render(request, 'users/login.html')


def profile_view(request):
    """Profile page – shows Fluxer user info + their Jesters."""
    account = _social_account(request)
    if not account:
        return redirect('login')

    extra = account.extra_data
    username = extra.get('username', '')
    discriminator = extra.get('discriminator', '0')
    fluxer_tag = (
        f'{username}#{discriminator}'
        if discriminator and discriminator != '0'
        else username
    )
    display_name = extra.get('global_name') or ''
    avatar_url = extra.get('avatar_url')
    fluxer_id = account.uid

    jesters = Jester.objects.filter(user_id=fluxer_id)

    return render(request, 'users/profile.html', {
        'fluxer_id': fluxer_id,
        'fluxer_tag': fluxer_tag,
        'display_name': display_name,
        'avatar_url': avatar_url,
        'jesters': jesters,
    })


def logout_view(request):
    """Clears session and redirects to login."""
    if request.method == 'POST':
        auth_logout(request)
    return redirect('login')
