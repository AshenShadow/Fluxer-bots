from django.db import models


class FluxerUser(models.Model):
    """
    Lean custom user model for Fluxer-authenticated users.
    No Django auth bloat - just what we need.
    """
    fluxer_id = models.CharField(max_length=64, unique=True)
    # Full Fluxer tag format: Username#NNNN (e.g. Ash_Shadowflame#5555)
    fluxer_tag = models.CharField(max_length=100)
    # Display name (global name / nickname on Fluxer)
    display_name = models.CharField(max_length=100, blank=True, default='')
    avatar_url = models.URLField(blank=True, default='')
    access_token = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.fluxer_tag} ({self.fluxer_id})'
