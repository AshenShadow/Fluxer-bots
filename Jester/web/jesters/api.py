from ninja import Router, Schema, UploadedFile, File, Form
from ninja.errors import HttpError
from typing import List, Optional
from .models import Jester
from django.conf import settings

router = Router()

class JesterSchema(Schema):
    id: int
    name: str
    prefix: str
    avatar_url: Optional[str] = None
    discord_avatar_url: Optional[str] = None
    user_id: str

@router.get("/user/{user_id}", response=List[dict])
def list_jesters(request, user_id: str):
    jesters = []
    for j in Jester.objects.filter(user_id=user_id):
        jesters.append({
            "id": j.id,
            "name": j.name,
            "prefix": j.prefix,
            "user_id": j.user_id,
            "avatar_url": j.avatar_url,
            "local_avatar_url": j.avatar.url if j.avatar else None,
            "discord_avatar_url": j.discord_avatar_url
        })
    return jesters

@router.get("/all", response=List[dict])
def list_all_jesters(request):
    jesters = []
    for j in Jester.objects.all():
        jesters.append({
            "id": j.id,
            "name": j.name,
            "prefix": j.prefix,
            "user_id": j.user_id,
            "avatar_url": j.avatar_url,
            "local_avatar_url": j.avatar.url if j.avatar else None,
            "discord_avatar_url": j.discord_avatar_url
        })
    return jesters

@router.post("/", response=JesterSchema)
def create_jester(request, 
                 name: str = Form(...), 
                 prefix: str = Form(...), 
                 user_id: str = Form(...),
                 avatar: UploadedFile = File(None)):
    
    print(f"Creating Jester: Name={name}, Prefix={prefix}, User={user_id}, Avatar={avatar}")
    
    # Check for duplicate prefix for this user
    if Jester.objects.filter(user_id=user_id, prefix=prefix).exists():
        raise HttpError(400, "Prefix error: Prefix already exists.")

    jester = Jester(
        name=name,
        prefix=prefix,
        user_id=user_id
    )
    if avatar:
        print("Avatar found, assigning.")
        jester.avatar = avatar
    jester.save()
    print(f"Jester saved: ID={jester.id}")
    return jester

class JesterUpdateSchema(Schema):
    discord_avatar_url: Optional[str] = None
    name: Optional[str] = None
    prefix: Optional[str] = None

@router.patch("/{jester_id}", response=JesterSchema)
def update_jester(request, jester_id: int, payload: JesterUpdateSchema):
    jester = Jester.objects.get(id=jester_id)
    if payload.discord_avatar_url is not None:
        jester.discord_avatar_url = payload.discord_avatar_url
    if payload.name is not None:
        jester.name = payload.name
    if payload.prefix is not None:
        jester.prefix = payload.prefix
    jester.save()
    return jester

@router.post("/{jester_id}/avatar", response=JesterSchema)
def update_avatar(request, jester_id: int, avatar: UploadedFile = File(...)):
    jester = Jester.objects.get(id=jester_id)
    jester.avatar = avatar
    # Reset discord_avatar_url so the bot will re-upload it to Discord/Fluxer on next proxy
    jester.discord_avatar_url = None
    jester.save()
    return jester
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
