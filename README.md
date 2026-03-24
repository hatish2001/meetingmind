# MeetingMind 🧠

> AI-powered meeting notes - your personal meeting assistant

MeetingMind is a self-hosted alternative to Granola that transforms your meetings into organized, searchable notes with AI-powered enhancements. Record meetings, transcribe audio, and let AI summarize key points, extract action items, and answer questions about your meetings.

![MeetingMind](https://img.shields.io/badge/Version-1.0.0-blue) ![License](https://img.shields.io/badge/License-MIT-green) ![Node](https://img.shields.io/badge/Node.js-16+-yellow)

## ✨ Features

- **🎙️ Audio Recording** - Record meetings directly in the browser with live transcription preview
- **📝 AI Notepad** - Create and edit meeting notes with rich text support
- **🤖 AI Enhancement** - Automatically generate summaries, extract action items, and create follow-ups
- **❓ Ask Questions** - Query your meeting notes like "What decisions were made?"
- **📋 Templates** - Pre-built templates for customer discovery, user interviews, 1-on-1s, and more
- **🔗 Sharing** - Share notes via public link or export to Markdown, HTML, JSON
- **🌙 Dark Mode** - Clean, modern UI with dark and light theme support
- **🔒 Self-Hosted** - Your data stays on your server

## 🚀 Quick Start

### One-Line Install (Linux/macOS)

```bash
curl -fsSL https://raw.githubusercontent.com/harishraj/meetingmind/main/install.sh | bash
```

### Manual Installation

1. Clone the repository:
```bash
git clone https://github.com/harishraj/meetingmind.git
cd meetingmind
```

2. Install dependencies:
```bash
npm install
```

3. Copy and configure environment:
```bash
cp .env.example .env
# Edit .env and add your MiniMax API key
```

4. Start the server:
```bash
npm start
```

5. Open http://localhost:3000

### Docker Installation

```bash
# With Docker Compose
MINIMAX_API_KEY=your_key_here docker-compose up -d

# Or build and run manually
docker build -t meetingmind .
docker run -p 3000:3000 -e MINIMAX_API_KEY=your_key meetingmind
```

## 🔑 API Configuration

MeetingMind uses MiniMax for AI features. Get your API key:

1. Sign up at [https://minimax.chat/](https://minimax.chat/)
2. Get your API key from the dashboard
3. Add it to your `.env` file:
```
MINIMAX_API_KEY=your_api_key_here
```

## 📁 Project Structure

```
meetingmind/
├── backend/
│   ├── server.js           # Express server
│   ├── db.js               # SQLite database
│   ├── routes/
│   │   ├── notes.js        # CRUD for notes
│   │   ├── transcription.js # Audio upload/transcription
│   │   └── ai.js           # AI enhancement endpoints
│   ├── agents/
│   │   ├── transcriber.js  # Audio-to-text agent
│   │   ├── enhancer.js      # Note enhancement agent
│   │   └── exporter.js      # Export to various formats
│   └── services/
│       └── minimax.js      # MiniMax API wrapper
├── frontend/
│   ├── index.html          # Main app
│   ├── css/style.css       # Styles
│   └── js/
│       ├── app.js         # Main application logic
│       ├── recorder.js    # Audio recording
│       └── api.js         # API client
├── data/                   # SQLite DB & uploads (created at runtime)
├── docker-compose.yml
├── Dockerfile
├── install.sh              # One-line installer
└── package.json
```

## 🛠️ API Reference

### Notes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes` | List all notes |
| POST | `/api/notes` | Create a note |
| GET | `/api/notes/:id` | Get a note |
| PUT | `/api/notes/:id` | Update a note |
| DELETE | `/api/notes/:id` | Delete a note |
| POST | `/api/notes/:id/share` | Generate share link |

### Transcription

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/transcription/transcribe` | Upload audio and transcribe |

### AI Enhancement

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/enhance/:noteId` | Generate summary/action items |
| POST | `/api/ai/ask/:noteId` | Ask questions about the meeting |
| POST | `/api/ai/generate/:noteId` | Generate content (blog, CRM, etc.) |
| GET | `/api/ai/templates` | List templates |
| POST | `/api/ai/templates` | Create custom template |

## 🎨 Templates

MeetingMind includes several built-in templates:

- **General Meeting** - Generic meeting notes
- **Customer Discovery** - For customer discovery calls
- **User Interview** - For user research interviews
- **1-on-1 Meeting** - For individual meetings
- **Brainstorming Session** - For creative brainstorming
- **Daily Standup** - For daily standup meetings

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Built as a self-hosted alternative to [Granola](https://www.granola.ai/)
- Powered by [MiniMax](https://minimax.chat/) for AI features
- Built with Node.js, Express, SQLite, and vanilla JavaScript

---

**Made with ❤️ for better meetings**
