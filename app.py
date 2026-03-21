from flask import Flask, request, jsonify
from twilio.twiml.messaging_response import MessagingResponse
from config import Config
from database import init_db, db
from models import Service, Booking
from whatsapp_bot import WhatsAppBookingBot

app = Flask(__name__)
app.config.from_object(Config)

# Initialize bot and seed services
bot = WhatsAppBookingBot()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': Config.BUSINESS_NAME})

@app.route('/webhook', methods=['POST'])
def webhook():
    """Twilio WhatsApp webhook endpoint."""
    incoming_msg = request.values.get('Body', '').strip()
    sender_phone = request.values.get('From', '').replace('whatsapp:', '')

    resp = MessagingResponse()
    msg = resp.message()

    try:
        reply = bot.process_message(sender_phone, incoming_msg)
        msg.body(reply)
    except Exception as e:
        app.logger.error(f"Bot error: {e}")
        msg.body("⚠️ Something went wrong. Please try again.")

    return str(resp), 200, {'Content-Type': 'application/xml'}

@app.route('/bookings', methods=['GET'])
def list_bookings():
    """Admin endpoint to view all bookings (simple auth)."""
    # TODO: Add basic auth
    bookings = Booking.query.order_by(Booking.booking_time.desc()).all()
    return jsonify([b.to_dict() for b in bookings])

@app.route('/services', methods=['GET', 'POST'])
def manage_services():
    """Admin endpoint to manage services."""
    # TODO: Add auth
    if request.method == 'POST':
        data = request.get_json()
        svc = Service(
            name=data['name'],
            description=data.get('description', ''),
            duration_minutes=data.get('duration_minutes', 60),
            price=data.get('price', 0.0)
        )
        db.session.add(svc)
        db.session.commit()
        return jsonify(svc.to_dict()), 201

    services = Service.query.all()
    return jsonify([s.to_dict() for s in services])

def seed_services():
    """Create default services if none exist."""
    with app.app_context():
        if Service.query.count() == 0:
            defaults = [
                Service(name='Haircut', description='Classic haircut and wash', duration_minutes=45, price=35.0),
                Service(name='Full Color', description='Hair coloring and treatment', duration_minutes=120, price=85.0),
                Service(name='Manicure', description='Nail shaping, cuticle care, polish', duration_minutes=30, price=25.0),
                Service(name='Massage 30min', description='Relaxing swedish massage', duration_minutes=30, price=40.0),
                Service(name='Massage 60min', description='Full body massage', duration_minutes=60, price=70.0),
            ]
            db.session.add_all(defaults)
            db.session.commit()
            print("✅ Seeded default services")

if __name__ == '__main__':
    init_db(app)
    seed_services()
    app.run(host='0.0.0.0', port=5000, debug=app.config.get('FLASK_DEBUG', False))