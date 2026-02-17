from django.shortcuts import render, redirect
from .models import Jester

def index(request):
    if request.method == 'POST':
        user_id = request.POST.get('user_id')
        if user_id:
            return redirect(f'/dashboard/?user_id={user_id}')
    return render(request, 'jesters/index.html')

def dashboard(request):
    user_id = request.GET.get('user_id')
    if not user_id:
        return redirect('index')
    
    jesters = Jester.objects.filter(user_id=user_id)
    return render(request, 'jesters/dashboard.html', {'jesters': jesters, 'user_id': user_id})

def create_jester(request):
    user_id = request.GET.get('user_id') or request.POST.get('user_id')
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
        return redirect(f'/dashboard/?user_id={user_id}')
        
    return render(request, 'jesters/create_jester.html', {'user_id': user_id})

def browse_jesters(request):
    jesters = Jester.objects.all().order_by('-created_at')
    return render(request, 'jesters/browse_jesters.html', {'jesters': jesters})
