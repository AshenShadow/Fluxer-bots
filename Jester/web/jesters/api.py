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
    discord_avatar_url: str

@router.patch("/{jester_id}", response=JesterSchema)
def update_jester(request, jester_id: int, payload: JesterUpdateSchema):
    jester = Jester.objects.get(id=jester_id)
    jester.discord_avatar_url = payload.discord_avatar_url
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
