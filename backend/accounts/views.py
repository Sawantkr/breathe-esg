from django.contrib.auth.models import User

from django.contrib.auth import authenticate

from rest_framework.response import Response

from rest_framework.decorators import api_view

from .serializers import SignupSerializer



# SIGNUP

@api_view(['POST'])
def signup(request):

    print("SIGNUP API HIT")

    print(request.data)

    serializer = SignupSerializer(
        data=request.data
    )

    if serializer.is_valid():

        user = serializer.save()

        print("USER CREATED:", user.username)

        return Response({

            "message":
            "Account created successfully",

            "username":
            user.username,

            "email":
            user.email
        })

    print(serializer.errors)

    return Response(

        serializer.errors,

        status=400
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

    print("LOGIN ATTEMPT:", username)

    user = authenticate(

        username=username,

        password=password
    )

    if user is not None:

        print("LOGIN SUCCESS")

        return Response({

            "message":
            "Login successful",

            "username":
            user.username,

            "email":
            user.email
        })

    print("LOGIN FAILED")

    return Response({

        "error":
        "Invalid credentials"

    }, status=401)



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