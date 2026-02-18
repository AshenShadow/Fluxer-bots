import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'jester_web.settings')
django.setup()

from jesters.models import Jester

count = Jester.objects.count()
Jester.objects.all().delete()
print(f"Deleted {count} Jesters.")
