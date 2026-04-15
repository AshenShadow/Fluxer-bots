"""
Signal handler that syncs every Fluxer OAuth login into users_fluxeruser.

Fires after allauth completes a social login (new or returning user).
"""
from allauth.socialaccount.signals import social_account_updated, social_account_added
from django.dispatch import receiver
from .models import FluxerUser


def _sync_fluxer_user(social_account):
    """Create or update a FluxerUser from a SocialAccount."""
    if social_account.provider != 'fluxer':
        return

    extra = social_account.extra_data or {}
    fluxer_id = social_account.uid

    username = extra.get('username', '')
    discriminator = extra.get('discriminator', '0')
    fluxer_tag = (
        f'{username}#{discriminator}'
        if discriminator and discriminator != '0'
        else username
    )
    display_name = extra.get('global_name') or ''
    avatar_url = extra.get('avatar_url') or ''

    FluxerUser.objects.update_or_create(
        fluxer_id=fluxer_id,
        defaults={
            'fluxer_tag': fluxer_tag,
            'display_name': display_name,
            'avatar_url': avatar_url,
        },
    )


@receiver(social_account_added)
def on_social_account_added(request, sociallogin, **kwargs):
    """New user just signed up via Fluxer OAuth."""
    _sync_fluxer_user(sociallogin.account)


@receiver(social_account_updated)
def on_social_account_updated(request, sociallogin, **kwargs):
    """Returning user logged in again – refresh their data."""
    _sync_fluxer_user(sociallogin.account)
