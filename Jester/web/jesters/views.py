from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from allauth.socialaccount.models import SocialAccount
from .models import Jester, Changelog, Report, ReportComment
from users.models import FluxerUser
from .api import file_to_data_uri

def _get_user_display_info(fluxer_id):
    """Returns (display_name, avatar_url) for a given fluxer_id.
    Tries FluxerUser first, falls back to SocialAccount extra_data."""
    # Try FluxerUser first
    try:
        fu = FluxerUser.objects.get(fluxer_id=fluxer_id)
        name = fu.display_name or fu.fluxer_tag
        avatar = fu.avatar_url
        if name and avatar:
            return name, avatar
    except FluxerUser.DoesNotExist:
        pass
    
    # Fall back to SocialAccount
    try:
        sa = SocialAccount.objects.get(uid=fluxer_id, provider='fluxer')
        extra = sa.extra_data or {}
        name = extra.get('global_name') or extra.get('username') or 'Unknown User'
        avatar = extra.get('avatar_url') or ''
        return name, avatar
    except SocialAccount.DoesNotExist:
        pass
    
    return 'Unknown User', ''

def _get_fluxer_id(user):
    try:
        return SocialAccount.objects.get(user=user, provider='fluxer').uid
    except SocialAccount.DoesNotExist:
        return None

DEVELOPER_FLUXER_ID = '1471566346806080119'

def _is_admin_or_mod(fluxer_id):
    if fluxer_id == DEVELOPER_FLUXER_ID:
        return True, False
    try:
        user = FluxerUser.objects.get(fluxer_id=fluxer_id)
        return user.is_admin, user.is_moderator
    except FluxerUser.DoesNotExist:
        return False, False

def index(request):
    latest_changelog = Changelog.objects.order_by('-created_at').first()
    return render(request, 'jesters/index.html', {'latest_changelog': latest_changelog})

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
            avatar=file_to_data_uri(avatar) if avatar else None
        )
        return redirect('dashboard')
        
    return render(request, 'jesters/create_jester.html', {'user_id': user_id})

def browse_jesters(request):
    jesters = Jester.objects.all().order_by('-created_at')
    return render(request, 'jesters/browse_jesters.html', {'jesters': jesters})

@login_required(login_url='login')
def moderator_dashboard(request):
    if not request.user.is_superuser:
        return redirect('index')
    
    total_jesters = Jester.objects.count()
    total_users = FluxerUser.objects.count()
    open_reports_count = Report.objects.filter(status='open').count()
    
    recent_reports = Report.objects.filter(status='open').order_by('-created_at')[:10]
    for report in recent_reports:
        name, avatar = _get_user_display_info(report.author_id)
        report.author_name = name
        report.author_avatar = avatar
        
    return render(request, 'jesters/moderator.html', {
        'total_jesters': total_jesters,
        'total_users': total_users,
        'open_reports_count': open_reports_count,
        'recent_reports': recent_reports,
    })

def changelog_view(request):
    user_id = _get_fluxer_id(request.user) if request.user.is_authenticated else None
    is_admin = False
    
    if user_id:
        is_admin, _ = _is_admin_or_mod(user_id)
        
    if request.user.is_superuser:
        is_admin = True
        
    if request.method == 'POST' and is_admin:
        version = request.POST.get('version')
        bot_changes = request.POST.get('bot_changes')
        web_changes = request.POST.get('web_changes')
        if version:
            Changelog.objects.create(
                version=version,
                bot_changes=bot_changes,
                web_changes=web_changes
            )
            return redirect('changelog')
            
    changelogs = Changelog.objects.all().order_by('-created_at')
    return render(request, 'jesters/changelog.html', {
        'changelogs': changelogs,
        'is_admin': is_admin
    })

def reports_view(request):
    if request.method == 'POST' and request.user.is_authenticated:
        user_id = _get_fluxer_id(request.user)
        title = request.POST.get('title')
        description = request.POST.get('description')
        category = request.POST.get('category', 'bug')
        if title and description and user_id:
            Report.objects.create(
                title=title,
                description=description,
                author_id=user_id,
                category=category
            )
            return redirect('reports')
            
    search_query = request.GET.get('q', '').strip()
    
    open_reports = Report.objects.filter(status='open').order_by('-created_at')
    resolved_reports = Report.objects.filter(status='resolved').order_by('-created_at')
    
    if search_query:
        open_reports = open_reports.filter(title__icontains=search_query)
        resolved_reports = resolved_reports.filter(title__icontains=search_query)
    
    for report in list(open_reports) + list(resolved_reports):
        name, avatar = _get_user_display_info(report.author_id)
        report.author_name = name
        report.author_avatar = avatar
    
    return render(request, 'jesters/reports.html', {
        'open_reports': open_reports,
        'resolved_reports': resolved_reports,
        'search_query': search_query,
    })

def report_detail_view(request, report_id):
    report = get_object_or_404(Report, id=report_id)
    user_id = _get_fluxer_id(request.user) if request.user.is_authenticated else None
    
    is_admin = False
    is_mod = False
    if user_id:
        is_admin, is_mod = _is_admin_or_mod(user_id)
    
    if request.user.is_superuser:
        is_admin = True
        
    can_manage = is_admin or is_mod or (user_id and report.author_id == user_id)
    
    if request.method == 'POST' and request.user.is_authenticated:
        action = request.POST.get('action')
        
        if action == 'comment':
            text = request.POST.get('text')
            if text and user_id:
                ReportComment.objects.create(
                    report=report,
                    author_id=user_id,
                    text=text
                )
        elif action == 'resolve' and can_manage:
            report.status = 'resolved'
            report.save()
            return redirect('reports')
        elif action == 'delete' and can_manage:
            report.delete()
            return redirect('reports')
            
        return redirect('report_detail', report_id=report.id)
        
    comments = report.comments.all().order_by('created_at')
    for comment in comments:
        name, avatar = _get_user_display_info(comment.author_id)
        comment.author_name = name
        comment.author_avatar = avatar

    report_name, report_avatar = _get_user_display_info(report.author_id)
    report.author_name = report_name
    report.author_avatar = report_avatar
    
    return render(request, 'jesters/report_detail.html', {
        'report': report,
        'comments': comments,
        'can_manage': can_manage,
        'user_id': user_id
    })
