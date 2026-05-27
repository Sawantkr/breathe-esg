from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework.response import Response
from rest_framework.decorators import api_view
from .serializers import SignupSerializer
from .models import Organization, UserProfile

# SIGNUP
@api_view(['POST'])
def signup(request):
    org_name = request.data.get("organization_name", "Default Organization").strip()
    if not org_name:
        org_name = "Default Organization"
        
    serializer = SignupSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        org, _ = Organization.objects.get_or_create(name=org_name)
        UserProfile.objects.get_or_create(user=user, organization=org)
        
        return Response({
            "message": "Account created successfully",
            "username": user.username,
            "email": user.email,
            "organization_name": org.name,
            "organization_id": org.id
        })
    return Response(serializer.errors, status=400)


# NORMAL LOGIN
@api_view(['POST'])
def login(request):
    username = request.data.get("username")
    password = request.data.get("password")
    
    user = authenticate(username=username, password=password)
    if user is not None:
        # Get or create profile/org if missing for some reason
        profile = getattr(user, 'profile', None)
        if not profile:
            org, _ = Organization.objects.get_or_create(name="Default Organization")
            profile, _ = UserProfile.objects.get_or_create(user=user, organization=org)
            
        return Response({
            "message": "Login successful",
            "username": user.username,
            "email": user.email,
            "organization_name": profile.organization.name,
            "organization_id": profile.organization.id
        })
        
    return Response({
        "error": "Invalid credentials"
    }, status=401)


# GOOGLE LOGIN
@api_view(["POST"])
def google_login(request):
    email = request.data.get("email")
    username = request.data.get("username")
    org_name = request.data.get("organization_name", "Default Organization").strip()
    if not org_name:
        org_name = "Default Organization"
        
    # Get or create user
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            "username": username or email.split('@')[0]
        }
    )
    
    # Get or create organization and profile
    org, _ = Organization.objects.get_or_create(name=org_name)
    profile, _ = UserProfile.objects.get_or_create(
        user=user,
        defaults={
            "organization": org
        }
    )
    
    return Response({
        "username": user.username,
        "email": user.email,
        "organization_name": profile.organization.name,
        "organization_id": profile.organization.id
    })