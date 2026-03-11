const { createBooking, cancelBooking, getAllBookings, clearBookings } = require('../../src/booking');
const { setupTestConfig, testConfig } = require('../helpers');

// Ensure config exists
setupTestConfig();

describe('End-to-End Workflow Tests', () => {
  before(() => {
    // Additional test-specific setup if needed
  });

  beforeEach(async () => {
    await clearBookings();
  });

  it('should allow full booking lifecycle: create -> list -> cancel', async () => {
    // 1. Create a booking
    const createRes = await createBooking('+15551234567', 4, '2026-04-20', '19:00');
    expect(createRes.success).to.be.true;
    const bookingId = createRes.id;
    expect(bookingId).to.be.a('number');

    // 2. List bookings and verify it appears
    const allBookings = await getAllBookings();
    const newBooking = allBookings.find(b => b.id === bookingId);
    expect(newBooking).to.exist;
    expect(newBooking.phone).to.equal('+15551234567');
    expect(newBooking.status).to.equal('confirmed');

    // 3. Cancel the booking
    const cancelRes = await cancelBooking('+15551234567', bookingId);
    expect(cancelRes.success).to.be.true;

    // 4. Verify status changed
    const afterCancel = await getAllBookings();
    const cancelledBooking = afterCancel.find(b => b.id === bookingId);
    expect(cancelledBooking.status).to.equal('cancelled');
  });

  it('should respect open hours and slot boundaries end-to-end', async () => {
    // Valid slot
    let res = await createBooking('+15559876543', 2, '2026-04-21', '10:00'); // Tuesday 10:00
    expect(res.success).to.be.true;

    // Invalid slot (not on 30-min boundary)
    res = await createBooking('+15559876543', 2, '2026-04-21', '10:15');
    expect(res.success).to.be.false;
    expect(res.message).to.include('30-minute intervals');

    // Outside open hours
    res = await createBooking('+15559876543', 2, '2026-04-21', '08:00');
    expect(res.success).to.be.false;
    expect(res.message).to.include('open from');
  });
});
