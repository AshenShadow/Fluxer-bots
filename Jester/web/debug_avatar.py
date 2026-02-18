
import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'jester_web.settings')
django.setup()

from jesters.models import Jester

try:
    j = Jester.objects.first()
    if j:
        print(f"Checking Jester: {j.name}")
        if j.discord_avatar_url:
            print(f"Discord Avatar: {j.discord_avatar_url}")
        
        if j.avatar:
            print(f"Avatar Field: {j.avatar}")
            try:
                print(f"Avatar URL: {j.avatar.url}")
            except Exception as e:
                print(f"Error accessing avatar.url: {e}")
        else:
            print("No avatar file")
    else:
        print("No jesters found")

except Exception as e:
    print(f"General Error: {e}")
