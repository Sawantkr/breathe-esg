from django.contrib.auth.models import User

from django.contrib.auth import authenticate

from rest_framework.response import Response

from rest_framework.decorators import api_view

from .serializers import SignupSerializer



# SIGNUP

@api_view(['POST'])
def signup(request):

    serializer = SignupSerializer(
        data=request.data
    )

    if serializer.is_valid():

        serializer.save()

        return Response({
            "message":
            "Account created successfully"
        })

    return Response(
        serializer.errors
    )



# NORMAL LOGIN

@api_view(['POST'])
def login(request):

    username = request.data.get(
        "username"
    )

    password = request.data.get(
        "password"
    )

    user = authenticate(

        username=username,

        password=password
    )

    if user:

        return Response({

            "message":
            "Login successful",

            "username":
            user.username,

            "email":
            user.email
        })

    return Response({

        "error":
        "Invalid credentials"

    }, status=400)



# GOOGLE LOGIN

@api_view(["POST"])
def google_login(request):

    email = request.data.get(
        "email"
    )

    username = request.data.get(
        "username"
    )

    user, created = User.objects.get_or_create(

        email=email,

        defaults={

            "username":
            username
        }
    )

    return Response({

        "username":
        user.username,

        "email":
        user.email
    })