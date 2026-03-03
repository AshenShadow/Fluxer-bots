"""
Fluxer OAuth2 provider + adapter for django-allauth.

Adapter is defined here (not in views.py) so FluxerProvider can reference
oauth2_adapter_class without causing a circular import.
"""
import requests
from allauth.socialaccount.providers.base import ProviderAccount
from allauth.socialaccount.providers.oauth2.provider import OAuth2Provider
from allauth.socialaccount.providers.oauth2.views import OAuth2Adapter

FLUXER_API_BASE = 'https://api.fluxer.app'
FLUXER_AUTH_URL = 'https://web.fluxer.app/oauth2/authorize'
FLUXER_TOKEN_URL = f'{FLUXER_API_BASE}/oauth2/token'
FLUXER_USER_URL = f'{FLUXER_API_BASE}/users/@me'


class FluxerOAuth2Adapter(OAuth2Adapter):
    provider_id = 'fluxer'
    authorize_url = FLUXER_AUTH_URL
    access_token_url = FLUXER_TOKEN_URL
    profile_url = FLUXER_USER_URL

    def complete_login(self, request, app, token, **kwargs):
        headers = {'Authorization': f'Bearer {token.token}'}
        response = requests.get(self.profile_url, headers=headers)
        response.raise_for_status()
        extra_data = response.json()

        # Build avatar URL from CDN
        avatar_hash = extra_data.get('avatar')
        user_id = extra_data.get('id')
        if avatar_hash and user_id:
            extra_data['avatar_url'] = (
                f'https://cdn.fluxerstatic.com/avatars/{user_id}/{avatar_hash}.png'
            )
        else:
            extra_data['avatar_url'] = None

        return self.get_provider().sociallogin_from_response(request, extra_data)


class FluxerAccount(ProviderAccount):
    def to_str(self):
        return self.account.extra_data.get('username', super().to_str())


class FluxerProvider(OAuth2Provider):
    id = 'fluxer'
    name = 'Fluxer'
    account_class = FluxerAccount
    oauth2_adapter_class = FluxerOAuth2Adapter  # Required by allauth v65+

    def extract_uid(self, data):
        return str(data['id'])

    def extract_common_fields(self, data):
        username = data.get('username', '')
        discriminator = data.get('discriminator', '0')
        fluxer_tag = (
            f"{username}#{discriminator}"
            if discriminator and discriminator != '0'
            else username
        )
        return {
            'username': fluxer_tag,
            'name': data.get('global_name') or username,
        }

    def get_default_scope(self):
        return ['identify']


provider_classes = [FluxerProvider]
