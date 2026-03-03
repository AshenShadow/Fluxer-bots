from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from ninja import NinjaAPI

from jesters.api import router as jesters_router
from users.api import router as users_router
from users.views import login_view, profile_view, logout_view, oauth2_login, oauth2_callback

api = NinjaAPI()
api.add_router('/jesters', jesters_router)
api.add_router('/users', users_router)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api.urls),
    # Page routes
    path('login/', login_view, name='login'),
    path('profile/', profile_view, name='profile'),
    path('logout/', logout_view, name='logout'),
    # Fluxer OAuth2 – mounted explicitly so allauth generates the right redirect_uri
    path('accounts/fluxer/login/', oauth2_login, name='fluxer_login'),
    path('accounts/fluxer/login/callback/', oauth2_callback, name='fluxer_callback'),
    path('', include('jesters.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
