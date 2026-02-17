from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from ninja import NinjaAPI

# ... (imports) ...
from jesters.api import router as jesters_router

api = NinjaAPI()
api.add_router("/jesters", jesters_router)

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/", api.urls),
    path('', include('jesters.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
