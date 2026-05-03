from django.db import models

class JesterGroup(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    image = models.TextField(blank=True, null=True)
    fluxer_image_url = models.CharField(max_length=255, blank=True, null=True)
    user_id = models.CharField(max_length=50, help_text="Fluxer User ID")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def image_url(self):
        if self.fluxer_image_url:
            return self.fluxer_image_url
        if self.image:
            return f"/api/jesters/groups/{self.id}/image.png"
        return ""

    def __str__(self):
        return f"{self.name} ({self.user_id})"
class Jester(models.Model):
    name = models.CharField(max_length=100)
    display_name = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    # Prefix only trigger: "Prefix: Message"
    prefix = models.CharField(max_length=50)
    # Base64 encoded avatar data
    avatar = models.TextField(blank=True, null=True)
    # Store the Fluxer CDN URL here after first upload (optional caching)
    fluxer_avatar_url = models.CharField(max_length=255, blank=True, null=True)
    user_id = models.CharField(max_length=50, help_text="Fluxer User ID")
    
    # Many-to-many relationship with groups
    groups = models.ManyToManyField(JesterGroup, related_name='jesters', blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    message_count = models.IntegerField(default=0)

    @property
    def avatar_url(self):
        if self.fluxer_avatar_url:
            return self.fluxer_avatar_url
        if self.avatar:
            return f"/api/jesters/{self.id}/avatar.png"
        return ""

    def __str__(self):
        return f"{self.name} ({self.prefix})"

class Autoproxy(models.Model):
    user_id = models.CharField(max_length=50, help_text="Fluxer User ID")
    channel_id = models.CharField(max_length=50, help_text="Fluxer Channel ID")
    jester = models.ForeignKey(Jester, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('user_id', 'channel_id')

    def __str__(self):
        return f"User {self.user_id} -> {self.jester.name} in {self.channel_id}"

class Changelog(models.Model):
    version = models.CharField(max_length=50)
    bot_changes = models.TextField(blank=True, null=True)
    web_changes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Version {self.version}"

class Report(models.Model):
    STATUS_CHOICES = (
        ('open', 'Open'),
        ('resolved', 'Resolved'),
    )
    CATEGORY_CHOICES = (
        ('bug', 'Bug'),
        ('feature', 'Feature Request'),
        ('question', 'Question'),
        ('other', 'Other'),
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    author_id = models.CharField(max_length=50, help_text="Fluxer User ID")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='bug')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.status.upper()}] {self.title}"

class ReportComment(models.Model):
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='comments')
    author_id = models.CharField(max_length=50, help_text="Fluxer User ID")
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.author_id} on {self.report.title}"
