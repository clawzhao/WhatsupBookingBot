# WhatsApp Booking Demo

A simple WhatsApp-based booking system using Twilio API. Demonstrates conversational booking flows, service scheduling, and appointment management.

## Features
- WhatsApp message handling via Twilio webhook
- Service catalog and booking dialogue
- Appointment scheduling with time slots
- SQLite persistence (ready for Postgres)
- Docker support for easy deployment

## Quick Start

### 1. Environment Setup
```bash
cp .env.example .env
# Edit .env with your Twilio credentials
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run Locally
```bash
python app.py
```

### 4. Expose with ngrok
```bash
ngrok http 5000
# Set Twilio webhook to: https://your-ngrok.ngrok.io/webhook
```

## Docker
```bash
docker build -t whatsapp-booking-demo .
docker run -p 5000:5000 --env-file .env whatsapp-booking-demo
```

## Project Structure
```
whatsapp-booking-demo/
├── app.py              # Flask app + webhook
├── config.py           # Configuration loader
├── database.py         # DB models & session
├── models.py           # SQLAlchemy models
├── whatsapp_bot.py     # Conversation logic
├── requirements.txt    # Python dependencies
├── Dockerfile
├── .env.example
└── tests/
    └── test_booking.py
```

## License: MIT