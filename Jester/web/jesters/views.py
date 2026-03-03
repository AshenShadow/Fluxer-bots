from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from allauth.socialaccount.models import SocialAccount
from .models import Jester

def _get_fluxer_id(user):
    try:
        return SocialAccount.objects.get(user=user, provider='fluxer').uid
    except SocialAccount.DoesNotExist:
        return None

def index(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    return render(request, 'jesters/index.html')

@login_required(login_url='login')
def dashboard(request):
    user_id = _get_fluxer_id(request.user)
    if not user_id:
        return redirect('index')
    
    jesters = Jester.objects.filter(user_id=user_id)
    return render(request, 'jesters/dashboard.html', {'jesters': jesters, 'user_id': user_id})

@login_required(login_url='login')
def create_jester(request):
    user_id = _get_fluxer_id(request.user)
    if not user_id:
        return redirect('index')
        
    if request.method == 'POST':
        name = request.POST.get('name')
        prefix = request.POST.get('prefix')
        avatar = request.FILES.get('avatar')
        
        Jester.objects.create(
            name=name,
            prefix=prefix,
            user_id=user_id,
            avatar=avatar
        )
        return redirect('dashboard')
        
    return render(request, 'jesters/create_jester.html', {'user_id': user_id})

def browse_jesters(request):
    jesters = Jester.objects.all().order_by('-created_at')
    return render(request, 'jesters/browse_jesters.html', {'jesters': jesters})
