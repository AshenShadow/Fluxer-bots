from django.db import models

class Jester(models.Model):
    name = models.CharField(max_length=100)
    # Prefix only trigger: "Prefix: Message"
    prefix = models.CharField(max_length=50)
    # File upload for avatar
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    # Store the Discord/Fluxer CDN URL here after first upload
    discord_avatar_url = models.CharField(max_length=255, blank=True, null=True)
    user_id = models.CharField(max_length=50, help_text="Fluxer User ID")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def avatar_url(self):
        if self.discord_avatar_url:
            return self.discord_avatar_url
        if self.avatar:
            return self.avatar.url
        return ""

    def __str__(self):
        return f"{self.name} ({self.prefix})"
