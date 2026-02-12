# ✨ Study Mitra - BY TEAM BEYOND-BITS - https://studymitraa.netlify.app/ OR https://study-mitra.netlify.app/

> **Unlock Your Potential: A Smart Academic Portfolio, Communication, Learning & Note Management System.**

Study Mitra is a high-performance academic hub designed to bridge the gap between casual study habits and professional career building. By leveraging AI-driven OCR and automated skill mapping, the platform transforms your notes and certifications into a verified, recruiter-ready portfolio. Not only that, but Study Mitra allows you to join different study posts of others, converse with them in real-time and study together with them. AI will generate the notes of that conversation in 1 click and 2 seconds of your precious time.

----------------------------------------------------------------------------------------------------

## 🛠 Project Architecture

This repository follows a modular full-stack architecture as seen in the project root:

```
STUDY MITRA
├── backend-main/api/             # API Core logic & groq Specs
├── backend-main/ backend/        # Django configurations for   the api
├── frontend/        # React (Vite) + Glassmorphism UI
├── .env             # Global Environment Configurations
├── .gitignore       # Git exclusion rules
├── manage.py        # Django CLI entry point
├── package-lock.json# Frontend version locking
├── README.md        # Project documentation
└── requirements.txt # Backend dependencies (Django)
```

---
**The solution**

1.**AI Portfolio Builder:** Automatically detects skills like "Web Designing" or "Coding" from uploaded images and populates your profile badges.

2.**Intelligent Note Vault:** Features a toggle for Public vs. Private visibility, ensuring your personal study drafts stay secure while your best work is shared.

3.**Dual-Mode Interface:** The UI dynamically transforms between an Editor Mode (for management) and a Viewer Mode (for public portfolio display).

4.**Glassmorphism UI:** A premium SaaS-style aesthetic featuring dark-mode blurred surfaces and high-contrast vibrant accents.

5.**AI conversation analysis and note generation**: Automatically generate notes from any conversation in just one click.

6.**Exam Preparation Section**: Fetch important questions and topics just by providing the subject, grade and difficulty. AI can solve the questions and clear your doubts.

7.**Micro Challenges**: A fun section for students, where they can solve different Study related challenges like quizes.

---
## **TECH STACK**

**Frontend**
- React.js + Vite (For easy code writing and understanding)
- Axios (for managing API data)

**Backend (Django)**
- Python (easy Database management and admin protected)
- PostgreSQL (easy management of complex data structures)
- Firebase (easy to set up - real time database, used for the chatting feature)

**AI Integration**
- Google Cloud Vision (OCR) (Very easy to set up with Cloudinary)
- Groq AI (Instant-lightning speed with generously smart features for free tier)

**Infrastructure**
- JWT Authentication (for safe, easy Auth management)
- Python-dotenv (for security)

**External APIs**
- Groq (used for AI services)
- Cloudinary API (used for uploading/handling images)


---
## **🚦 Getting Started**

### 1. Environment Config
Ensure your `.env` in the root directory is populated:

```
Check the .env.example file, create the files in mentioned directories and add your variables.
```

### 2. Backend Setup
Activate your environment and initialize the Django server:

```bash
# Activation 
cd backend-main
venv\Scripts\activate 

# Install required packages
pip install -r requirements.txt

# Run migrations and start
python manage.py migrate
python manage.py runserver
```

### 3. Frontend Setup
Navigate to the frontend directory and launch the development environment:

```bash
cd frontend
npm install
npm run dev
```

---
## **🚀 Hackathon Roadmap**

- [ ] Global Search: Search public notes uploaded by different students.
- [ ] Collaborative Hub: Communicate and study with strangers, notes arrived on one click.
- [ ] AI Study Buddy: A chatbot that generates quizzes based on your specific uploaded notes.
- [ ] Fun Micro challenges: Sharpens your mind while keeping it engaged and enjoying.

---
---

Developed for KMC Hackathon 2026. Built with passion to empower the next generation of scholars.

**COPYRIGHTED BY TEAM BEYOND-BITS**


