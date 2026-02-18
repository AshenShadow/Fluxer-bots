import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'jester_web.settings')
django.setup()

from jesters.models import Jester

jesters = Jester.objects.all()
for j in jesters:
    print(f"ID: {j.id}, Name: {j.name}, Prefix: {j.prefix}")
    print(f"  Local Avatar: {j.avatar}")
    print(f"  Discord Avatar: {j.discord_avatar_url}")
    print("-" * 20)
