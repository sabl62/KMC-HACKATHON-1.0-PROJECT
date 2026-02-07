import json
import uuid
from groq import Groq
from django.conf import settings
from django.db import models as django_models
from django.utils import timezone

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import StudyPost, StudySession, ConversationNote, UserProfile, UserMedia
from .serializers import (
    StudyPostSerializer, StudySessionSerializer,
    ConversationNoteSerializer, UserProfileSerializer, 
    RegisterSerializer, UserSerializer, UserMediaSerializer
)
from .tasks import analyze_conversation_task

client = Groq(api_key=settings.GROQ_API_KEY)

class RegisterView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            UserProfile.objects.get_or_create(user=user)
            
            refresh = RefreshToken.for_user(user)
            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    @action(detail=False, methods=['get', 'post'])
    def me(self, request):
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        
        if request.method == 'POST':
            serializer = self.get_serializer(profile, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def upload_media(self, request):
        file_url = request.data.get('fileUrl') or request.data.get('file_url')
        category = request.data.get('category')
      
        raw_text = request.data.get('aiAnalysisText', '').strip()

        if not file_url:
            return Response({"error": "No URL provided"}, status=400)

    
        media_obj = UserMedia.objects.create(
            user=request.user,
            file_url=file_url,
            category=category,
            title="Processing..." if category == 'certificate' else "New Note"
        )

   
        if category == 'certificate' and raw_text:
            try:
         
                prompt = (
                    f"Analyze this OCR text from a certificate: '{raw_text}'. "
                    "Return ONLY a JSON object with keys: 'title', 'issuer', 'skills' (list). "
                    "If a value is unknown, use 'Not found'."
                )
                
                completion = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant that outputs only JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    response_format={"type": "json_object"}
                )
                
                ai_data = json.loads(completion.choices[0].message.content)
                
  
                media_obj.title = ai_data.get('title') or "Certificate"
                media_obj.issuer = ai_data.get('issuer') or "Verified Issuer"
                media_obj.skills = ai_data.get('skills') or []

                if media_obj.title == "Processing...":
                    media_obj.title = "Verified Certificate"

                media_obj.save()
                print(f"AI Successfully processed: {media_obj.title}")

            except Exception as e:
                print(f"AI Error: {str(e)}")
                media_obj.title = "Certificate (AI Analysis Failed)"
                media_obj.save()
        
        elif category == 'certificate' and not raw_text:

            media_obj.title = "Certificate (No text found)"
            media_obj.save()

        return Response(UserMediaSerializer(media_obj).data, status=201)


class StudyPostViewSet(viewsets.ModelViewSet):
    queryset = StudyPost.objects.filter(is_active=True)
    serializer_class = StudyPostSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = StudyPost.objects.filter(is_active=True)
        subject = self.request.query_params.get('subject', None)
        if subject:
            queryset = queryset.filter(subject__icontains=subject)
        
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                django_models.Q(title__icontains=search) |
                django_models.Q(topic__icontains=search) |
                django_models.Q(description__icontains=search)
            )
        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def join(self, request, pk=None):
        post = self.get_object()
        user = request.user
        session = StudySession.objects.filter(post=post, is_active=True).first()

        if not session:
            firestore_id = f"session_{uuid.uuid4().hex}"
            session = StudySession.objects.create(
                post=post,
                creator=post.user,
                firestore_chat_id=firestore_id,
                is_active=True,
                ai_notes_enabled=True
            )
            session.participants.add(post.user)

        if session.participants.filter(id=user.id).exists():
            return Response(StudySessionSerializer(session).data)

        if session.participants.count() >= 5:
            return Response({'error': 'Session full'}, status=status.HTTP_400_BAD_REQUEST)

        session.participants.add(user)
        return Response(StudySessionSerializer(session).data)


class StudySessionViewSet(viewsets.ModelViewSet):
    queryset = StudySession.objects.all()
    serializer_class = StudySessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(
            django_models.Q(creator=self.request.user) | 
            django_models.Q(participants=self.request.user)
        ).distinct().order_by('-started_at')

    @action(detail=True, methods=['post'])
    def end_session(self, request, pk=None):
        session = self.get_object()
        if request.user != session.creator and not session.participants.filter(id=request.user.id).exists():
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        session.is_active = False
        session.ended_at = timezone.now()
        session.save()
        return Response({'message': 'Session ended'})

    @action(detail=True, methods=['get'])
    def notes(self, request, pk=None):
        notes = ConversationNote.objects.filter(session_id=pk)
        serializer = ConversationNoteSerializer(notes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def generate_notes(self, request, pk=None):
        session = self.get_object()
        messages = request.data.get('messages', [])
        if not messages:
            return Response({'error': 'No messages'}, status=status.HTTP_400_BAD_REQUEST)
        
        task = analyze_conversation_task.delay(session.id, messages)
        return Response({'task_id': task.id}, status=status.HTTP_202_ACCEPTED)

class ConversationNoteViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ConversationNote.objects.all()
    serializer_class = ConversationNoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(
            django_models.Q(session__creator=self.request.user) | 
            django_models.Q(session__participants=self.request.user)
        ).distinct().order_by('-created_at')