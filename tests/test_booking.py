import pytest
from datetime import datetime, timedelta
from app import app, db
from models import Service, Booking
from whatsapp_bot import WhatsAppBookingBot
import pytz
from freezegun import freeze_time

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    with app.app_context():
        db.create_all()
        # Seed services
        svc = Service(name='Test Service', duration_minutes=60, price=50.0)
        db.session.add(svc)
        db.session.commit()
    yield app.test_client()
    with app.app_context():
        db.drop_all()

def test_health(client):
    resp = client.get('/health')
    assert resp.status_code == 200
    assert resp.json['status'] == 'ok'

def test_seeded_services(client):
    resp = client.get('/services')
    assert resp.status_code == 200
    assert len(resp.json) >= 1

def test_bot_greeting():
    bot = WhatsAppBookingBot()
    reply = bot.process_message('+1234567890', 'hi')
    assert 'Welcome' in reply or 'book' in reply.lower()

def test_bot_service_selection():
    bot = WhatsAppBookingBot()
    # Force state
    state = bot.get_state('+1234567890')
    state['step'] = 'choose_service'
    reply = bot.process_message('+1234567890', '1')
    assert 'date' in reply.lower() or 'send' in reply.lower()

def test_create_booking_via_flow():
    bot = WhatsAppBookingBot()
    phone = '+1234567890'
    flow = [
        '1',                    # Book
        '1',                    # Service 1
        '2025-12-25',          # Date
        '14:00',               # Time
        'John Doe',            # Name
        'yes'                  # Confirm
    ]
    for msg in flow:
        bot.process_message(phone, msg)
    final_state = bot.get_state(phone)
    assert final_state['step'] == 'greeting'  # Reset after booking