
import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'jester_web.settings')
django.setup()

from jesters.models import Jester

print(f"Total Jesters: {Jester.objects.count()}")
for j in Jester.objects.all():
    print(f"ID: {j.id}, Name: {j.name}, Prefix: {j.prefix}, UserID: {j.user_id}")
