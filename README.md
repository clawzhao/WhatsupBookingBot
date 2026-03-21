# WhatsApp & Telegram Booking Demo

A dual-channel booking system supporting both WhatsApp (via Twilio) and Telegram. Demonstrates conversational booking flows, service scheduling, appointment management, and multi-platform integration.

## Features

### Core Features
- ✅ Conversational booking interface
- ✅ Service catalog and selection
- ✅ Appointment scheduling with time slots
- ✅ SQLite database (ready for PostgreSQL)
- ✅ Multi-channel support (WhatsApp + Telegram)
- ✅ Docker support for containerized deployment
- ✅ Booking management and cancellation

### WhatsApp Channel (Python/Flask)
- Twilio webhook integration
- Real-time message handling
- Service booking flow
- Appointment confirmation and tracking

### Telegram Channel (Node.js)
- Telegram Bot API integration
- Interactive keyboard menus
- Booking history retrieval
- User-friendly interactive polling

## Tech Stack

### Backend
- **WhatsApp Service**: Python 3 + Flask + SQLAlchemy
- **Telegram Service**: Node.js + Express
- **Database**: SQLite (with SQLAlchemy ORM)
- **Deployment**: Docker + Docker Compose

### Dependencies
- Python: Flask, SQLAlchemy, Flask-SQLAlchemy, twilio, python-dotenv
- Node.js: Express, node-telegram-bot-api, cors

## Project Structure

```
whatsapp-booking-demo/
│
├── Python Backend (WhatsApp)
│   ├── app.py                  # Flask app + Twilio webhook
│   ├── config.py               # Configuration loader
│   ├── database.py             # DB models & session
│   ├── models.py               # SQLAlchemy models
│   ├── whatsapp_bot.py         # WhatsApp conversation logic
│   ├── requirements.txt        # Python dependencies
│   └── venv/                   # Python virtual environment
│
├── Node Backend (Telegram)
│   ├── src/
│   │   ├── index.js            # Main Express server
│   │   ├── telegram.js         # Telegram bot handler
│   │   ├── whatsapp.js         # WhatsApp integration
│   │   ├── booking.js          # Booking logic
│   │   ├── config.js           # Config management
│   │   └── unanswered.js       # Q&A handling
│   ├── package.json
│   └── node_modules/           # Node dependencies
│
├── Chatbot Module
│   └── chatbot/                # Additional chatbot services
│
├── Data & Configuration
│   ├── config/                 # Configuration files
│   ├── data/                   # Data storage
│   ├── chroma_data/            # Vector embeddings storage
│   ├── public/                 # Static assets
│   └── .env.example            # Environment template
│
├── Infrastructure
│   ├── Dockerfile              # Docker image definition
│   ├── docker-compose.yml      # Multi-service orchestration
│   └── Makefile                # Build automation
│
└── Documentation & Tests
    ├── README.md               # This file
    ├── tests/                  # Test suite
    └── SETUP.md               # Detailed setup guide
```

## Quick Start

### Prerequisites
- Python 3.8+ with venv
- Node.js 14+
- npm or yarn
- Twilio account (for WhatsApp)
- Telegram Bot Token

### Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials:
# - TELEGRAM_BOT_TOKEN=your_token_here
# - WHATSAPP_ENABLED=false (or true if using Twilio)
```

### Installation

#### Option 1: Using Docker Compose (Recommended)
```bash
docker-compose up --build
```
This starts both services automatically.

#### Option 2: Manual Setup

**WhatsApp Service (Python - Port 5000)**
```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the service
python app.py
```

**Telegram Service (Node.js - Port 3000)**
```bash
# Install dependencies
npm install

# Run the service
npm start
# Or: node src/index.js
```

### Quick Launch

The easiest way to start both services is using the provided startup script:

```bash
# Start both WhatsApp and Telegram services
./start.sh

# Start in background
./start.sh --background

# Start only WhatsApp service
./start.sh --python-only

# Start only Telegram service
./start.sh --node-only

# Show help
./start.sh --help
```

**Output Logs:**
- Python service: `logs/python.log`
- Node.js service: `logs/node.log`

## Running Both Services (Manual)

**Terminal 1 - WhatsApp (Python):**
```bash
cd /path/to/whatsapp-booking-demo
source venv/bin/activate
python app.py
# Runs on http://localhost:3010
```

**Terminal 2 - Telegram (Node.js):**
```bash
cd /path/to/whatsapp-booking-demo
npm start
# Runs on http://localhost:3000
```

### Exposing Services

For WhatsApp webhook (requires ngrok):
```bash
ngrok http 5000
# Set Twilio webhook to: https://your-ngrok.ngrok.io/webhook
```

## API Endpoints

### WhatsApp Service (Flask)
- `GET /health` - Service health check
- `POST /webhook` - Twilio webhook endpoint for incoming messages
- `GET /bookings` - List all bookings
- `GET/POST /services` - Manage services
- `GET /config` - Get system configuration

### Telegram Service (Express)
- `GET /api/config` - Get configuration
- `POST /api/config` - Update configuration
- `GET /api/bookings` - Get all bookings
- `GET /api/bookings/:id` - Get specific booking

## Configuration

### Environment Variables (.env)
```bash
# Service
PORT=3000

# WhatsApp
WHATSAPP_ENABLED=false
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE=+1234567890

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_ALLOWED_USERS=    # Optional: comma-separated user IDs

# Database
DATABASE_URL=sqlite:///bookings.db
```

## Development

### Running Tests
```bash
# Python tests
python -m pytest tests/

# Node tests
npm test
```

### Making Changes
1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and test
3. Commit: `git add -A && git commit -m "feat: your description"`
4. Push: `git push origin feature/your-feature`

## Deployment

### Docker Deployment
```bash
# Build image
docker build -t whatsapp-booking-demo .

# Run container
docker run -p 5000:5000 -p 3000:3000 --env-file .env whatsapp-booking-demo
```

### Docker Compose Deployment
```bash
docker-compose up -d
```

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5000 (WhatsApp)
lsof -i :5000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Kill process on port 3000 (Telegram)
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Module Not Found
```bash
# Python
source venv/bin/activate
pip install -r requirements.txt

# Node.js
npm install
```

### Database Issues
```bash
# Reset database (careful!)
rm bookings.db
# Recreate on next run
```

## Documentation

Project documentation is organized in the `doc/` folder:

- **[SETUP.md](doc/SETUP.md)** - Detailed setup and configuration guide
- **[IMPLEMENTATION_SUMMARY.md](doc/IMPLEMENTATION_SUMMARY.md)** - Implementation details and architecture
- **[UNANSWERED_QUESTIONS.md](doc/UNANSWERED_QUESTIONS.md)** - Q&A system documentation

## External References

- **Twilio Docs**: https://www.twilio.com/docs/whatsapp
- **Telegram Bot API**: https://core.telegram.org/bots/api
- **Flask**: https://flask.palletsprojects.com/
- **SQLAlchemy**: https://www.sqlalchemy.org/

## License

MIT License - See LICENSE file for details

## Changelog

### Latest Changes (2026-03-22)
- Added comprehensive Telegram bot support
- Improved multi-platform architecture
- Enhanced README with full documentation
- Cleaned up temporary development files
- Streamlined project structure

---

**Last Updated**: March 22, 2026
**Repository**: [GitHub Link]
