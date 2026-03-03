"""
REST API endpoints for the users app.
GET  /api/users/me      – returns the current logged-in Fluxer user
POST /api/users/logout  – clears the session
"""
from ninja import Router
from django.contrib.auth import logout as django_logout
from allauth.socialaccount.models import SocialAccount
from ninja.errors import HttpError

router = Router()


def _get_current_user(request):
    """
    Returns the SocialAccount for the active session user, or None.
    Allauth stores the social account linked to request.user.
    """
    if not request.user or not request.user.is_authenticated:
        return None
    try:
        return SocialAccount.objects.get(user=request.user, provider='fluxer')
    except SocialAccount.DoesNotExist:
        return None


@router.get('/me', response=dict)
def me(request):
    """Returns current session user's Fluxer info."""
    account = _get_current_user(request)
    if not account:
        raise HttpError(401, 'Not authenticated')

    extra = account.extra_data
    username = extra.get('username', '')
    discriminator = extra.get('discriminator', '0')
    fluxer_tag = f'{username}#{discriminator}' if discriminator and discriminator != '0' else username
    display_name = extra.get('global_name') or username

    return {
        'fluxer_id': account.uid,
        'fluxer_tag': fluxer_tag,
        'display_name': display_name,
        'avatar_url': extra.get('avatar_url'),
    }


@router.post('/logout', response={200: dict})
def logout(request):
    """Clears the user session."""
    django_logout(request)
    return 200, {'status': 'logged out'}
