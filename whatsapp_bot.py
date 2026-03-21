import re
from datetime import datetime, timedelta, time
from typing import Optional, Tuple
import pytz
from models import Service, Booking, db
from config import Config

class WhatsAppBookingBot:
    def __init__(self):
        self.state = {}  # phone_number -> conversation state
        self.timezone = pytz.timezone(Config.TIMEZONE)

    def get_state(self, phone: str):
        if phone not in self.state:
            self.state[phone] = {'step': 'greeting', 'data': {}}
        return self.state[phone]

    def reset_state(self, phone: str):
        self.state[phone] = {'step': 'greeting', 'data': {}}

    def process_message(self, phone: str, message: str) -> str:
        state = self.get_state(phone)
        step = state['step']
        data = state['data']

        message = message.strip().lower()

        # Global commands
        if message in ['cancel', 'exit', 'quit']:
            self.reset_state(phone)
            return "❌ Booking cancelled. Send any message to start again."

        if message in ['restart', 'start', 'menu']:
            self.reset_state(phone)
            return self._greeting()

        # State machine
        if step == 'greeting':
            return self._handle_greeting(phone, message)
        elif step == 'choose_service':
            return self._handle_service_selection(phone, message)
        elif step == 'choose_date':
            return self._handle_date_input(phone, message)
        elif step == 'choose_time':
            return self._handle_time_selection(phone, message)
        elif step == 'confirm_name':
            return self._handle_name_input(phone, message)
        elif step == 'confirm_booking':
            return self._handle_booking_confirmation(phone, message)
        elif step == 'view_bookings':
            return self._handle_view_bookings(phone, message)
        else:
            self.reset_state(phone)
            return self._greeting()

    def _greeting(self) -> str:
        return (
            "👋 Welcome to *{}*!\n\n"
            "How can I help you today?\n"
            "1️⃣ Book an appointment\n"
            "2️⃣ View my bookings\n"
            "3️⃣ Cancel a booking\n\n"
            "Reply with a number or *menu* anytime."
        ).format(Config.BUSINESS_NAME)

    def _handle_greeting(self, phone: str, message: str) -> str:
        if message in ['1', 'book', 'appointment', 'schedule']:
            return self._list_services(phone)
        elif message in ['2', 'view', 'my bookings', 'list']:
            return self._list_customer_bookings(phone)
        elif message in ['3', 'cancel booking']:
            return self._list_cancelable_bookings(phone)
        else:
            return "Please choose an option:\n1️⃣ Book\n2️⃣ View\n3️⃣ Cancel\n\nOr reply *menu*."

    def _list_services(self, phone: str) -> str:
        services = Service.query.filter_by(active=True).all()
        if not services:
            return "⚠️ No services available right now. Please try later."

        state = self.get_state(phone)
        state['step'] = 'choose_service'

        msg = "*Available Services:*\n\n"
        for i, svc in enumerate(services, 1):
            msg += f"{i}. {svc.name}\n   _{svc.description or 'No desc'}_\n   ⏱️ {svc.duration_minutes}min | 💰 ${svc.price:.2f}\n\n"
        msg += "Reply with the number to book."
        return msg

    def _handle_service_selection(self, phone: str, message: str) -> str:
        try:
            idx = int(message) - 1
            services = Service.query.filter_by(active=True).all()
            if 0 <= idx < len(services):
                state = self.get_state(phone)
                state['data']['service_id'] = services[idx].id
                state['data']['service_name'] = services[idx].name
                state['step'] = 'choose_date'
                return f"Selected: *{services[idx].name}*\n\n📅 Please send the date you want (YYYY-MM-DD) or *today* for today."
            else:
                return "Invalid number. Try again or reply *menu*."
        except:
            return "Please send a valid number."

    def _handle_date_input(self, phone: str, message: str) -> str:
        try:
            if message == 'today':
                date = datetime.now(self.timezone).date()
            else:
                date = datetime.strptime(message, '%Y-%m-%d').date()

            state = self.get_state(phone)
            state['data']['date'] = date.isoformat()
            state['step'] = 'choose_time'
            return f"📅 Date: {date.strftime('%A, %b %d, %Y')}\n\n🕐 Now send the time (HH:MM, 24h format)."
        except:
            return "Invalid date. Use YYYY-MM-DD or *today*."

    def _handle_time_selection(self, phone: str, message: str) -> str:
        try:
            # Parse time
            t = datetime.strptime(message, '%H:%M').time()
            date_str = self.get_state(phone)['data']['date']
            date = datetime.fromisoformat(date_str).date()
            booking_dt = self.timezone.localize(datetime.combine(date, t))

            # Check if in past
            now = datetime.now(self.timezone)
            if booking_dt < now:
                return "⏳ That time is in the past. Choose a future time."

            # Check for conflicts (basic ±1hr buffer)
            service_id = self.get_state(phone)['data']['service_id']
            service = Service.query.get(service_id)
            duration = service.duration_minutes if service else 60
            end_time = booking_dt + timedelta(minutes=duration)

            conflicts = Booking.query.filter(
                Booking.status != 'cancelled',
                Booking.booking_time < end_time,
                Booking.booking_time + timedelta(minutes=Service.duration_minutes) > booking_dt
            ).count()

            if conflicts > 0:
                return "⚠️ That slot is already taken. Try another time."

            state = self.get_state(phone)
            state['data']['booking_time'] = booking_dt.isoformat()
            state['step'] = 'confirm_name'
            return f"✅ Slot available!\n\n👤 What name should we put on the booking?"
        except:
            return "Invalid time. Format: HH:MM (e.g., 14:30)"

    def _handle_name_input(self, phone: str, message: str) -> str:
        name = message.strip().title()
        if len(name) < 2:
            return "Name too short. Try again."
        state = self.get_state(phone)
        state['data']['customer_name'] = name
        state['data']['customer_phone'] = phone
        state['step'] = 'confirm_booking'

        data = state['data']
        date = datetime.fromisoformat(data['date'])
        time_str = datetime.fromisoformat(data['booking_time']).strftime('%H:%M')
        svc = Service.query.get(data['service_id'])

        return (
            f"📋 *Booking Summary*\n"
            f"Service: {data['service_name']}\n"
            f"Date: {date.strftime('%A, %b %d')}\n"
            f"Time: {time_str}\n"
            f"Name: {name}\n"
            f"Phone: {phone}\n"
            f"Price: ${svc.price if svc else 0:.2f}\n\n"
            f"Confirm? Reply *yes* or *no*."
        )

    def _handle_booking_confirmation(self, phone: str, message: str) -> str:
        if message not in ['yes', 'confirm', 'y']:
            self.reset_state(phone)
            return "❌ Booking cancelled. Send *start* to begin again."

        data = self.get_state(phone)['data']
        try:
            # Create booking
            booking = Booking(
                customer_name=data['customer_name'],
                customer_phone=data['customer_phone'],
                service_id=data['service_id'],
                booking_time=datetime.fromisoformat(data['booking_time'])
            )
            db.session.add(booking)
            db.session.commit()

            self.reset_state(phone)

            svc = Service.query.get(data['service_id'])
            dt = datetime.fromisoformat(data['booking_time'])
            return (
                f"✅ *Booking Confirmed!*\n\n"
                f"🆔 ID: {booking.id}\n"
                f"Service: {svc.name}\n"
                f"Date & Time: {dt.strftime('%A, %b %d, %Y at %H:%M')}\n"
                f"Name: {data['customer_name']}\n\n"
                f"See you! To cancel, reply *cancel* anytime."
            )
        except Exception as e:
            db.session.rollback()
            return f"❌ Error saving booking: {str(e)}"

    def _list_customer_bookings(self, phone: str) -> str:
        bookings = Booking.query.filter_by(customer_phone=phone).order_by(Booking.booking_time).all()
        if not bookings:
            return "📭 You have no bookings."

        msg = "*Your Bookings:*\n\n"
        for b in bookings:
            dt = b.booking_time.astimezone(self.timezone)
            status_icon = '✅' if b.status == 'confirmed' else '❌' if b.status == 'cancelled' else '🔲'
            msg += f"{status_icon} ID {b.id}: {b.service.name}\n   {dt.strftime('%a, %b %d, %H:%M')} | {b.status}\n\n"
        msg += "Reply *cancel* to cancel a booking, or *menu* to go back."
        self.get_state(phone)['step'] = 'view_bookings'
        return msg

    def _list_cancelable_bookings(self, phone: str) -> str:
        bookings = Booking.query.filter_by(customer_phone=phone, status='confirmed').order_by(Booking.booking_time).all()
        if not bookings:
            return "📭 No active bookings to cancel."

        msg = "*Select booking to cancel:*\n\n"
        for b in bookings:
            dt = b.booking_time.astimezone(self.timezone)
            msg += f"❌ ID {b.id}: {b.service.name}\n   {dt.strftime('%a, %b %d, %H:%M')}\n\n"
        msg += "Reply the booking ID to confirm cancellation."
        self.get_state(phone)['step'] = 'view_bookings'
        return msg

    def _handle_view_bookings(self, phone: str, message: str) -> str:
        # Could be cancellation request
        try:
            booking_id = int(message)
            booking = Booking.query.filter_by(id=booking_id, customer_phone=phone).first()
            if booking:
                if booking.status == 'confirmed':
                    booking.status = 'cancelled'
                    db.session.commit()
                    return f"✅ Booking ID {booking_id} cancelled."
                else:
                    return f"⚠️ Booking is already {booking.status}."
            else:
                return "Booking not found or doesn't belong to you."
        except:
            return "Send a booking ID to cancel or *menu* to return."
