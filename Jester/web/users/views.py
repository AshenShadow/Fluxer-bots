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
    
    # Elevate the native Django user safely regardless of FluxerUser existence
    if fluxer_id == '1471566346806080119' or request.user.id == 1:
        if not request.user.is_superuser or not request.user.is_staff:
            request.user.is_superuser = True
            request.user.is_staff = True
            request.user.save()
        is_admin = True
        is_moderator = True
    else:
        is_admin = False
        is_moderator = False

    # Try to get the FluxerUser to sync admin/mod status
    from users.models import FluxerUser
    try:
        fluxer_user = FluxerUser.objects.get(fluxer_id=fluxer_id)
        if request.user.is_superuser:
            if not fluxer_user.is_admin or not fluxer_user.is_moderator:
                fluxer_user.is_admin = True
                fluxer_user.is_moderator = True
                fluxer_user.save()
        else:
            is_admin = fluxer_user.is_admin
            is_moderator = fluxer_user.is_moderator
    except FluxerUser.DoesNotExist:
        pass

    return render(request, 'users/profile.html', {
        'fluxer_id': fluxer_id,
        'fluxer_tag': fluxer_tag,
        'display_name': display_name,
        'avatar_url': avatar_url,
        'jesters': jesters,
        'is_admin': is_admin,
        'is_moderator': is_moderator,
    })


def logout_view(request):
    """Clears session and redirects to login."""
    if request.method == 'POST':
        auth_logout(request)
    return redirect('login')
