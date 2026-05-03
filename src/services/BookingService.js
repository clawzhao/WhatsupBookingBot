/**
 * Booking Service
 * Purpose: Core booking logic (Phase 2 implementation)
 */

class BookingService {
  async listAvailableSlots(days) {
    return [];
  }

  async getActiveBookings(studentPhone) {
    return [];
  }

  async createUnconfirmedBooking(data) {
    return null;
  }

  async rescheduleBooking(bookingId, newTimeslotId) {
    return null;
  }
}

module.exports = new BookingService();
