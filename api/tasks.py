from celery import shared_task
from django.conf import settings
from django.utils import timezone
from groq import Groq  
import json
import os
from .models import StudySession, ConversationNote
@shared_task
def analyze_conversation_task(session_id, messages):
    try:
        session = StudySession.objects.get(id=session_id)
        
        conversation_text = "\n".join([
            f"{msg.get('userName', 'User')}: {msg.get('text', '')}"
            for msg in messages
        ])

        client = Groq(api_key=settings.GROQ_API_KEY)
        
        prompt = f"""Analyze this study conversation and extract key learning points.
        
        Conversation:
        {conversation_text}

        Return exactly a JSON object with:
        1. key_concepts (list)
        2. definitions (list of {{'term': '...', 'definition': '...'}})
        3. study_tips (list)
        4. resources (list)
        5. summary (string)
        """

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile", 
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant that outputs only valid JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            response_format={"type": "json_object"},
            temperature=0.5,
            max_tokens=2048,
        )
        
        response_text = completion.choices[0].message.content
        analysis = json.loads(response_text)
 
        note = ConversationNote.objects.create(
            session=session,
            content=analysis.get('summary', 'No summary provided'),
            key_concepts=analysis.get('key_concepts', []),
            definitions=analysis.get('definitions', []),
            study_tips=analysis.get('study_tips', []),
            resources_mentioned=analysis.get('resources', []),
            message_count_analyzed=len(messages)
        )
        
        session.last_ai_analysis = timezone.now()
        session.save()
        
        return {'status': 'success', 'note_id': note.id}
        
    except Exception as e:
        return {'status': 'error', 'message': str(e)}