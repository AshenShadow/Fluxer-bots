from ninja import Router, Schema, UploadedFile, File, Form
from typing import List
from .models import Jester
from django.conf import settings

router = Router()

class JesterSchema(Schema):
    id: int
    name: str
    prefix: str
    avatar_url: str
    discord_avatar_url: str = None
    user_id: str

    @staticmethod
    def resolve_avatar_url(obj):
        if obj.discord_avatar_url:
            return obj.discord_avatar_url
        if obj.avatar:
            return obj.avatar.url
        return ""

@router.get("/{user_id}", response=List[JesterSchema])
def list_jesters(request, user_id: str):
    return Jester.objects.filter(user_id=user_id)

@router.post("/", response=JesterSchema)
def create_jester(request, 
                 name: str = Form(...), 
                 prefix: str = Form(...), 
                 user_id: str = Form(...),
                 avatar: UploadedFile = File(...)):
    
    jester = Jester.objects.create(
        name=name,
        prefix=prefix,
        user_id=user_id,
        avatar=avatar
    )
    return jester

class JesterUpdateSchema(Schema):
    discord_avatar_url: str

@router.patch("/{jester_id}", response=JesterSchema)
def update_jester(request, jester_id: int, payload: JesterUpdateSchema):
    jester = Jester.objects.get(id=jester_id)
    jester.discord_avatar_url = payload.discord_avatar_url
    jester.save()
    return jester
