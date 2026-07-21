# 🎯 NilGen - AI-Powered Mock Interview, Career Chatbot & Placement System

> **BTech 3rd Year Project** | Complete interview preparation platform with AI mock interviews, real-time feedback, performance analytics, and 24/7 career guidance chatbot

[![Made with React](https://img.shields.io/badge/React-18.0-blue.svg)](https://reactjs.org/)
[![Python](https://img.shields.io/badge/Python-3.11-green.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-teal.svg)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📋 Table of Contents
- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Installation](#installation)
- [Usage](#usage)
- [Screenshots](#screenshots)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## 🎓 About

**NilGen** is a comprehensive AI-powered mock interview and career preparation system designed to help students and job seekers excel in technical interviews. The platform combines realistic interview simulations, intelligent feedback analysis, and an AI career chatbot to provide end-to-end placement preparation support.

### Problem Statement
Students often struggle with interview preparation due to:
- Lack of realistic practice environments
- No immediate feedback on performance
- Difficulty in identifying improvement areas
- Limited access to personalized career guidance
- Uncertainty about company-specific interview patterns

### Solution
NilGen provides:
- **Realistic mock interviews** with AI-powered voice interviewer
- **Real-time feedback** on confidence, correctness, and communication
- **Personalized analytics** tracking progress over time
- **24/7 AI Career Chatbot** for instant placement guidance and advice
- **Company-specific insights** for targeted preparation

---

## ✨ Features

### 🎤 Realistic Mock Interviews
- **AI Voice Interviewer** - Natural text-to-speech with Indian-English accent
- **2D Animated Avatar** - Lip-synced responses with phoneme-accurate animation
- **Speech Recognition** - Real-time transcription of candidate answers
- **Video Analysis** - Computer vision-based confidence assessment

### 📊 Intelligent Feedback System
- **Multi-dimensional Analysis**:
  - ✅ **Correctness Score** - NLP-based answer evaluation
  - 😊 **Confidence Score** - Visual cues (eye contact, steadiness, pace)
  - 🎯 **Overall Performance** - Weighted combination of metrics
- **Detailed Breakdown** - Strengths and improvement areas
- **Actionable Insights** - Specific recommendations for improvement

### 📈 Performance Analytics
- **Session History** - Track all interview attempts
- **Visual Charts** - Score trends over time
- **Category Analysis** - Performance across different question types
- **Progress Tracking** - Measure improvement

### 🤖 AI Career Bot
- **24/7 Placement Guidance** - Gemini-powered chatbot
- **Personalized Advice** - Based on your skills and target role
- **Company-specific Prep** - Insights for top tech companies
- **CGPA-aware Recommendations** - Tailored to your academic profile

### 🎨 Modern UI/UX
- **Dark Theme** - Easy on the eyes
- **Responsive Design** - Works on desktop and mobile
- **Smooth Animations** - Framer Motion powered
- **Intuitive Navigation** - Clean, professional interface

### 🔒 Privacy & Security
- **Guest Mode** - Try without signup
- **Secure Authentication** - Token-based auth
- **Local Processing** - Video analysis happens client-side
- **No Data Leakage** - API keys properly secured

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library
- **Vite** - Lightning-fast build tool
- **TailwindCSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Lucide Icons** - Beautiful iconography
- **Chart.js** - Data visualization

### Backend
- **Python 3.11** - Core language
- **FastAPI** - High-performance web framework
- **SQLite** - Lightweight database
- **Uvicorn** - ASGI server

### AI/ML Components
- **Large Language Model (LLM)** - Advanced AI for intelligent chat, dynamic question generation, and natural speech synthesis
- **OpenCV** - Computer vision for real-time confidence analysis
- **TensorFlow** - Deep learning model for emotion detection
- **Scikit-learn** - Natural language processing for answer evaluation
- **Rhubarb Lip Sync** - Phoneme extraction for realistic avatar animation

### DevOps
- **Git** - Version control
- **GitHub Actions** - CI/CD pipeline
- **Environment Variables** - Secure configuration

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │Interview │  │Analytics │  │Career Bot│   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
        │             │             │             │
┌───────▼─────────────▼─────────────▼─────────────▼──────────┐
│                    Backend API (FastAPI)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Auth    │  │Interview │  │Analytics │  │  Chat    │   │
│  │ Service  │  │  Engine  │  │ Service  │  │  Bot     │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
        │             │             │             │
┌───────▼─────────────▼─────────────▼─────────────▼──────────┐
│                    AI/ML Layer                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Gemini   │  │  NLP     │  │ Vision   │  │   TTS    │   │
│  │   LLM    │  │ Grader   │  │ Analyzer │  │+ Lipsync │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
        │             │             │             │
        │             │             │             │
┌───────▼─────────────▼─────────────▼─────────────▼──────────┐
│                    Data Layer                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ SQLite   │  │  Audio   │  │  Models  │                  │
│  │   DB     │  │  Cache   │  │  Cache   │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Installation

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.11+
- **Git**
- **AI API Key** - For LLM and TTS capabilities ([Setup Guide](https://aistudio.google.com/app/apikey))

### Step 1: Clone Repository
```bash
git clone https://github.com/dwarkesh-creator/AI-Powered-Mock-Interview-Placement-System.git
cd AI-Powered-Mock-Interview-Placement-System
```

### Step 2: Backend Setup
```bash
cd Backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit .env and add your API key for LLM and TTS services
# GEMINI_API_KEY=your_api_key_here
# GEMINI_MODEL=gemini-3.1-flash-lite
# GEMINI_TTS_VOICE=Orbit
```

### Step 3: Frontend Setup
```bash
cd ../Frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Step 4: Start Backend Server
```bash
cd ../Backend

# Activate virtual environment if not already
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Start FastAPI server
python main.py
```

### Step 5: Access Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 📖 Usage

### 1. Guest Mode (Try Without Signup)
- Click **"Continue as Guest"** on login page
- Access all features with demo data
- Perfect for testing the system

### 2. Create Account
- Click **"Sign Up"** on login page
- Enter email and password
- Start your first interview

### 3. Take a Mock Interview
1. **Setup Interview**
   - Choose target role (e.g., Software Engineer)
   - Select target company (optional)
   - Upload resume (optional)
   - Set number of questions (3-10)

2. **During Interview**
   - Answer questions verbally
   - Recording starts automatically
   - AI avatar speaks questions with lip-sync
   - Your responses are transcribed in real-time

3. **Review Feedback**
   - View overall score
   - Check confidence breakdown
   - Read strengths and improvements
   - See detailed answer analysis

### 4. Track Progress
- Visit **Dashboard** for quick overview
- Check **Analytics** for detailed insights
- View trends over time
- Identify improvement areas

### 5. Get Career Guidance
- Open **Placement Bot**
- Ask about:
  - Interview preparation tips
  - Company-specific questions
  - Resume improvement
  - Technical topics
  - Career advice

---

## 📸 Screenshots

### Dashboard
![Dashboard](https://via.placeholder.com/800x400?text=Dashboard+Screenshot)

### Mock Interview
![Interview](https://via.placeholder.com/800x400?text=Interview+Room+Screenshot)

### Analytics
![Analytics](https://via.placeholder.com/800x400?text=Analytics+Dashboard)

### Career Bot
![Career Bot](https://via.placeholder.com/800x400?text=Placement+Bot+Screenshot)

---

## 📁 Project Structure

```
AI-Powered-Mock-Interview-Placement-System/
├── Backend/
│   ├── main.py                 # FastAPI application
│   ├── answer_grader.py        # NLP answer evaluation
│   ├── confidence.py           # Visual confidence analysis
│   ├── correctness.py          # Answer correctness scoring
│   ├── transcription.py        # Speech-to-text
│   ├── tts_lipsync.py          # Text-to-speech + lip-sync
│   ├── interview.py            # Interview logic
│   ├── requirements.txt        # Python dependencies
│   ├── .env.example            # Environment template
│   └── generated_audio/        # TTS audio cache
│
├── Frontend/
│   ├── src/
│   │   ├── Pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── InterviewSetup.jsx
│   │   │   ├── InterviewRoom.jsx
│   │   │   ├── Analytics.jsx
│   │   │   └── PlacementBot.jsx
│   │   ├── Component/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Avatar2D.jsx
│   │   │   ├── AnswerRecorder.jsx
│   │   │   └── BuiltBy.jsx
│   │   ├── Layout/
│   │   │   └── AppLayout.jsx
│   │   ├── Context/
│   │   │   └── AuthContext.jsx
│   │   ├── services/
│   │   │   └── interviewOrchestrator.js
│   │   └── App.jsx
│   ├── package.json
│   └── tailwind.config.js
│
├── Ai_Module/
│   ├── NLP/                    # Answer grading module
│   ├── vision/                 # Confidence analysis
│   └── llm/                    # LLM feedback
│
├── Database/
│   └── nilgen.db               # SQLite database
│
├── .gitignore
├── README.md
└── LICENSE
```

---

## 🎯 Key Features Implementation

### Answer Grading (NLP)
- Uses TF-IDF vectorization
- Cosine similarity with reference answers
- Keyword matching for technical terms
- Confidence scoring based on answer length and structure

### Confidence Analysis (Computer Vision)
- **Eye Contact**: Face detection + gaze estimation
- **Steadiness**: Head movement tracking
- **Speaking Pace**: Words per minute calculation
- Weighted scoring algorithm

### Text-to-Speech + Lip Sync
- **Gemini TTS** for natural voice
- **Rhubarb Lip Sync** for phoneme extraction
- Real-time mouth shape animation
- Configurable voice (male/female, accent)

### Career Guidance Bot
- Context-aware responses
- Conversation history maintenance
- Role-specific recommendations
- CGPA and skills-based advice

---

## 🔧 Configuration

### Backend Environment Variables
```env
# Required
GEMINI_API_KEY=your_api_key_here

# Optional (defaults shown)
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_TTS_MODEL=gemini-3.1-flash-tts-preview
GEMINI_TTS_VOICE=Orbit
```

### Voice Configuration Options
The system supports multiple AI voice profiles for the interviewer:
- **Orbit** (default) - Neutral professional male voice, optimized for Indian-English accent
- **Charon** - Mature, authoritative male voice
- **Fenrir** - Deep, commanding male voice
- **Sadaltager** - Professional female voice

---

## 🧪 Testing

```bash
# Backend tests
cd Backend
pytest

# Frontend tests (if implemented)
cd Frontend
npm test
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Dwarkesh Rathore**

- GitHub: [@dwarkesh-creator](https://github.com/dwarkesh-creator)
- Email: dwarkesh.rathore@example.com
- LinkedIn: [Dwarkesh Rathore](https://linkedin.com/in/dwarkesh-rathore)

---

## 🙏 Acknowledgments

- **Open Source LLM APIs** - For powerful language models and text-to-speech
- **Rhubarb Lip Sync** - For phoneme extraction technology
- **React Community** - For exceptional UI libraries and tools
- **FastAPI** - For comprehensive documentation and fast web framework
- **My College** - For project guidance and support

---

## 📚 References

- [Modern LLM APIs Documentation](https://ai.google.dev/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync)
- [OpenCV Documentation](https://docs.opencv.org/)
- [TensorFlow Guides](https://www.tensorflow.org/)

---

## 🐛 Known Issues

- Audio generation may be slow on first request (cold start)
- Vision analysis requires good lighting
- Browser compatibility: Chrome/Edge recommended

---

## 🚀 Future Enhancements

- [ ] 3D avatar with advanced expressions
- [ ] Multi-language support
- [ ] Group interview practice
- [ ] Interview recording download
- [ ] Mobile app version
- [ ] Integration with job portals
- [ ] Peer-to-peer mock interviews
- [ ] Company-specific question banks

---

## 📞 Support

For issues and questions:
- Open an [Issue](https://github.com/dwarkesh-creator/AI-Powered-Mock-Interview-Placement-System/issues)
- Email: dwarkesh.rathore@example.com

---

<div align="center">

**⭐ Star this repo if you find it helpful!**

Made with ❤️ by Dwarkesh Rathore

</div>
