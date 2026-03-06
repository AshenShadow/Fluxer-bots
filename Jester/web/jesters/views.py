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
        # Enforce Jester Limit (Maximum 100)
        if Jester.objects.filter(user_id=user_id).count() >= 100:
            return render(request, 'jesters/create_jester.html', {
                'user_id': user_id, 
                'error': 'You have reached the maximum number of Jesters allowed per account.'
            })

        name = request.POST.get('name')
        prefix = request.POST.get('prefix')
        avatar = request.FILES.get('avatar')
        
        # Check for duplicate prefix (also good to have here)
        if Jester.objects.filter(user_id=user_id, prefix=prefix).exists():
             return render(request, 'jesters/create_jester.html', {
                'user_id': user_id, 
                'error': 'This prefix is already in use.'
            })

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
