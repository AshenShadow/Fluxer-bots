from ninja import Router, Schema, UploadedFile, File, Form
from ninja.errors import HttpError
from typing import List, Optional
from .models import Jester
from django.conf import settings
import base64
from django.http import HttpResponse

def file_to_data_uri(uploaded_file):
    if not uploaded_file:
        return None
    data = uploaded_file.read()
    b64 = base64.b64encode(data).decode('utf-8')
    mime_type = getattr(uploaded_file, 'content_type', 'image/png')
    return f"data:{mime_type};base64,{b64}"

router = Router()

class JesterSchema(Schema):
    id: int
    name: str
    display_name: Optional[str] = None
    description: Optional[str] = None
    prefix: str
    avatar_url: Optional[str] = None
    fluxer_avatar_url: Optional[str] = None
    user_id: str
    group_ids: List[int] = []

class JesterGroupSchema(Schema):
    id: int
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    fluxer_image_url: Optional[str] = None
    user_id: str

@router.get("/user/{user_id}", response=List[dict])
def list_jesters(request, user_id: str):
    jesters = []
    for j in Jester.objects.filter(user_id=user_id).prefetch_related('groups'):
        jesters.append({
            "id": j.id,
            "name": j.name,
            "display_name": j.display_name,
            "description": j.description,
            "prefix": j.prefix,
            "user_id": j.user_id,
            "avatar_url": j.avatar_url,
            "local_avatar_url": j.avatar if j.avatar else None,
            "fluxer_avatar_url": j.fluxer_avatar_url,
            "group_ids": list(j.groups.values_list('id', flat=True)),
            "message_count": j.message_count
        })
    return jesters

@router.get("/all", response=List[dict])
def list_all_jesters(request):
    jesters = []
    for j in Jester.objects.all().prefetch_related('groups'):
        jesters.append({
            "id": j.id,
            "name": j.name,
            "display_name": j.display_name,
            "description": j.description,
            "prefix": j.prefix,
            "user_id": j.user_id,
            "avatar_url": j.avatar_url,
            "local_avatar_url": j.avatar if j.avatar else None,
            "fluxer_avatar_url": j.fluxer_avatar_url,
            "group_ids": list(j.groups.values_list('id', flat=True)),
            "message_count": j.message_count
        })
    return jesters

@router.post("/", response=dict)
def create_jester(request, 
                 name: str = Form(...), 
                 prefix: str = Form(...), 
                 user_id: str = Form(...),
                 display_name: str = Form(None),
                 description: str = Form(None),
                 avatar: UploadedFile = File(None)):
    
    print(f"Creating Jester: Name={name}, Prefix={prefix}, User={user_id}, Avatar={avatar}")
    
    # Enforce Jester Limit (Maximum 100)
    if Jester.objects.filter(user_id=user_id).count() >= 100:
        raise HttpError(400, "Limit error: You have reached the maximum number of Jesters allowed per account.")

    # Check for duplicate prefix for this user
    if Jester.objects.filter(user_id=user_id, prefix=prefix).exists():
        raise HttpError(400, "Prefix error: Prefix already exists.")

    jester = Jester(
        name=name,
        display_name=display_name,
        description=description,
        prefix=prefix,
        user_id=user_id
    )
    if avatar:
        print("Avatar found, assigning.")
        jester.avatar = file_to_data_uri(avatar)
    jester.save()
    print(f"Jester saved: ID={jester.id}")
    return {
        "id": jester.id,
        "name": jester.name,
        "display_name": jester.display_name,
        "description": jester.description,
        "prefix": jester.prefix,
        "user_id": jester.user_id,
        "avatar_url": jester.avatar_url,
        "fluxer_avatar_url": jester.fluxer_avatar_url,
        "group_ids": []
    }

# --- Groups Endpoints ---

from .models import JesterGroup

@router.post("/groups", response=JesterGroupSchema)
def create_group(request, 
                 name: str = Form(...), 
                 user_id: str = Form(...),
                 description: str = Form(None),
                 image: UploadedFile = File(None)):
    group = JesterGroup(
        name=name,
        user_id=user_id,
        description=description
    )
    if image:
        group.image = file_to_data_uri(image)
    group.save()
    return group

class GroupUpdateSchema(Schema):
    name: Optional[str] = None
    description: Optional[str] = None
    fluxer_image_url: Optional[str] = None

@router.patch("/groups/{group_id}", response=JesterGroupSchema)
def update_group(request, group_id: int, payload: GroupUpdateSchema):
    group = JesterGroup.objects.get(id=group_id)
    if payload.name is not None:
        group.name = payload.name
    if payload.description is not None:
        group.description = payload.description
    if payload.fluxer_image_url is not None:
        group.fluxer_image_url = payload.fluxer_image_url
    group.save()
    return group

@router.post("/groups/{group_id}/image", response=JesterGroupSchema)
def update_group_image(request, group_id: int, image: UploadedFile = File(...)):
    group = JesterGroup.objects.get(id=group_id)
    group.image = file_to_data_uri(image)
    group.fluxer_image_url = None
    group.save()
    return group

@router.get("/groups/{group_id}/image.png")
def get_group_image(request, group_id: int):
    try:
        group = JesterGroup.objects.get(id=group_id)
        if group.image and group.image.startswith("data:image"):
            header, encoded = group.image.split(",", 1)
            mime = header.split(":")[1].split(";")[0]
            decoded = base64.b64decode(encoded)
            return HttpResponse(decoded, content_type=mime)
    except JesterGroup.DoesNotExist:
        pass
    raise HttpError(404, "Image not found")

@router.delete("/groups/{group_id}", response={204: None})
def delete_group(request, group_id: int):
    try:
        group = JesterGroup.objects.get(id=group_id)
        group.delete()
        return 204, None
    except JesterGroup.DoesNotExist:
        raise HttpError(404, "Group not found")

@router.get("/groups/{user_id}", response=List[dict])
def list_groups(request, user_id: str):
    groups = []
    for g in JesterGroup.objects.filter(user_id=user_id):
        groups.append({
            "id": g.id,
            "name": g.name,
            "description": g.description,
            "image_url": g.image_url,
            "fluxer_image_url": g.fluxer_image_url,
            "user_id": g.user_id
        })
    return groups

class JesterUpdateSchema(Schema):
    fluxer_avatar_url: Optional[str] = None
    name: Optional[str] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    prefix: Optional[str] = None
    group_ids: Optional[List[int]] = None

@router.patch("/{jester_id}", response=dict)
def update_jester(request, jester_id: int, payload: JesterUpdateSchema):
    jester = Jester.objects.get(id=jester_id)
    if payload.fluxer_avatar_url is not None:
        jester.fluxer_avatar_url = payload.fluxer_avatar_url
    if payload.name is not None:
        jester.name = payload.name
    if payload.display_name is not None:
        jester.display_name = payload.display_name
    if payload.description is not None:
        jester.description = payload.description
    if payload.prefix is not None:
        jester.prefix = payload.prefix
        
    jester.save()
    
    # Handle Groups many-to-many relationship
    if payload.group_ids is not None:
        jester.groups.set(payload.group_ids)

    return {
        "id": jester.id,
        "name": jester.name,
        "display_name": jester.display_name,
        "description": jester.description,
        "prefix": jester.prefix,
        "user_id": jester.user_id,
        "avatar_url": jester.avatar_url,
        "fluxer_avatar_url": jester.fluxer_avatar_url,
        "group_ids": list(jester.groups.values_list('id', flat=True))
    }

@router.post("/{jester_id}/avatar", response=JesterSchema)
def update_avatar(request, jester_id: int, avatar: UploadedFile = File(...)):
    jester = Jester.objects.get(id=jester_id)
    jester.avatar = file_to_data_uri(avatar)
    # Reset fluxer_avatar_url so the bot will re-upload it to Fluxer/Fluxer on next proxy
    jester.fluxer_avatar_url = None
    jester.save()
    return jester

@router.get("/{jester_id}/avatar.png")
def get_avatar_image(request, jester_id: int):
    try:
        jester = Jester.objects.get(id=jester_id)
        if jester.avatar and jester.avatar.startswith("data:image"):
            header, encoded = jester.avatar.split(",", 1)
            mime = header.split(":")[1].split(";")[0]
            decoded = base64.b64decode(encoded)
            return HttpResponse(decoded, content_type=mime)
    except Jester.DoesNotExist:
        pass
    raise HttpError(404, "Avatar not found")

@router.delete("/{jester_id}", response={204: None})
def delete_jester(request, jester_id: int):
    try:
        jester = Jester.objects.get(id=jester_id)
        jester.delete()
        return 204, None
    except Jester.DoesNotExist:
        raise HttpError(404, "Jester not found")




class AutoproxySchema(Schema):
    jester_id: Optional[int] = None
    name: Optional[str] = None

@router.get("/autoproxy/{user_id}", response=List[dict])
def get_user_autoproxies(request, user_id: str):
    from .models import Autoproxy
    proxies = Autoproxy.objects.filter(user_id=user_id)
    return [{
        "channel_id": p.channel_id,
        "jester_id": p.jester.id,
        "jester_name": p.jester.name
    } for p in proxies]

@router.post("/autoproxy/{user_id}/{channel_id}")
def set_autoproxy(request, user_id: str, channel_id: str, payload: AutoproxySchema):
    from .models import Autoproxy, Jester
    if not payload.jester_id and not payload.name:
        raise HttpError(400, "Provide either jester_id or name")
    
    try:
        if payload.jester_id:
            jester = Jester.objects.get(id=payload.jester_id, user_id=user_id)
        else:
            jester = Jester.objects.get(name__iexact=payload.name, user_id=user_id)
    except Jester.DoesNotExist:
        raise HttpError(404, "Jester not found for this user")

    proxy, created = Autoproxy.objects.update_or_create(
        user_id=user_id,
        channel_id=channel_id,
        defaults={"jester": jester}
    )
    return {"status": "success", "jester": jester.name, "channel_id": channel_id}

@router.delete("/autoproxy/{user_id}/{channel_id}", response={204: None})
def remove_autoproxy(request, user_id: str, channel_id: str):
    from .models import Autoproxy
    deleted, _ = Autoproxy.objects.filter(user_id=user_id, channel_id=channel_id).delete()
    if deleted:
        return 204, None
    raise HttpError(404, "No autoproxy active in this channel")

# --- User Info Endpoint ---

@router.get("/user-info/{fluxer_id}", response=dict)
def get_user_info(request, fluxer_id: str):
    from users.models import FluxerUser
    from allauth.socialaccount.models import SocialAccount
    
    name = 'Unknown User'
    avatar = ''
    joined = '-'
    
    try:
        fu = FluxerUser.objects.get(fluxer_id=fluxer_id)
        name = fu.display_name or fu.fluxer_tag
        avatar = fu.avatar_url
        joined = fu.created_at.strftime('%b %Y')
    except FluxerUser.DoesNotExist:
        pass
    
    if name == 'Unknown User' or not avatar:
        try:
            sa = SocialAccount.objects.get(uid=fluxer_id, provider='fluxer')
            extra = sa.extra_data or {}
            name = extra.get('global_name') or extra.get('username') or name
            avatar = extra.get('avatar_url') or avatar
            joined = sa.date_joined.strftime('%b %Y') if hasattr(sa, 'date_joined') else joined
        except SocialAccount.DoesNotExist:
            pass
    
    jester_count = Jester.objects.filter(user_id=fluxer_id).count()
    total_messages = sum(Jester.objects.filter(user_id=fluxer_id).values_list('message_count', flat=True))
    
    return {
        'display_name': name,
        'avatar_url': avatar,
        'jester_count': jester_count,
        'total_messages': total_messages,
        'joined': joined,
    }
