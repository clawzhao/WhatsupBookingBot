const { expect } = require('chai');
const path = require('path');

// Set test environment for this module
process.env.NODE_ENV = 'test';
process.env.TEST_DB_PATH = path.join(__dirname, '../data/test-bookings.db');

const { setupTestConfig, testConfig } = require('../helpers');
const { clearBookings } = require('../../src/booking');

// Ensure config exists
setupTestConfig();

describe('Booking Module', () => {
  // Load fresh module to pick up TEST_DB_PATH
  let booking;
  before(() => {
    booking = require('../../src/booking');
  });

  beforeEach(async () => {
    await clearBookings();
  });

  describe('validateBooking', () => {
    it('should reject party size exceeding max', () => {
      const result = booking.validateBooking('2026-04-15', '19:00', 20);
      expect(result.valid).to.be.false;
      expect(result.message).to.include('Maximum party size');
    });

    it('should accept valid booking within limits', () => {
      const result = booking.validateBooking('2026-04-15', '19:00', 4);
      expect(result.valid).to.be.true;
    });

    it('should reject bookings outside opening hours', () => {
      let result = booking.validateBooking('2026-04-14', '08:00', 2); // Monday before open
      expect(result.valid).to.be.false;
      expect(result.message).to.include('open from');

      result = booking.validateBooking('2026-04-14', '23:00', 2); // After close
      expect(result.valid).to.be.false;
    });

    it('should reject bookings not on slot boundaries', () => {
      const result = booking.validateBooking('2026-04-15', '19:15', 2);
      expect(result.valid).to.be.false;
      expect(result.message).to.include('30-minute intervals');
    });

    it('should accept bookings on valid slot boundaries', () => {
      const result = booking.validateBooking('2026-04-15', '19:30', 2);
      expect(result.valid).to.be.true;
    });
  });

  describe('createBooking', () => {
    it('should create a booking and return success with ID', async () => {
      const result = await booking.createBooking('+15551234567', 4, '2026-04-15', '19:00');
      expect(result.success).to.be.true;
      expect(result.id).to.be.a('number');
      expect(result.message).to.include('Booking confirmed');
    });

    it('should reject invalid booking with proper message', async () => {
      const result = await booking.createBooking('+15551234567', 20, '2026-04-15', '19:00');
      expect(result.success).to.be.false;
      expect(result.message).to.include('Maximum party size');
    });

    it('should reject booking outside open hours', async () => {
      const result = await booking.createBooking('+15551234567', 2, '2026-04-15', '08:00');
      expect(result.success).to.be.false;
      expect(result.message).to.include('open from');
    });
  });

  describe('cancelBooking', () => {
    it('should cancel an existing booking', async () => {
      const createRes = await booking.createBooking('+15551234567', 2, '2026-04-15', '19:30');
      const id = createRes.id;

      const cancelRes = await booking.cancelBooking('+15551234567', id);
      expect(cancelRes.success).to.be.true;

      // Verify cancellation in DB
      const all = await booking.getAllBookings();
      const cancelled = all.find(b => b.id === id);
      expect(cancelled.status).to.equal('cancelled');
    });

    it('should reject cancellation of non-existent booking', async () => {
      const result = await booking.cancelBooking('+15551234567', 9999);
      expect(result.success).to.be.false;
      expect(result.message).to.include('not found');
    });

    it('should reject cancellation with mismatched phone', async () => {
      const createRes = await booking.createBooking('+15551234567', 2, '2026-04-15', '19:30');
      const result = await booking.cancelBooking('+15559876543', createRes.id);
      expect(result.success).to.be.false;
    });
  });

  describe('getAllBookings', () => {
    it('should return all bookings', async () => {
      await booking.createBooking('+15551111111', 2, '2026-04-16', '18:00');
      await booking.createBooking('+15552222222', 3, '2026-04-17', '20:00');

      const bookings = await booking.getAllBookings();
      expect(bookings).to.have.lengthOf.at.least(2);
    });

    it('should return bookings sorted by date desc, time desc', async () => {
      await booking.createBooking('+1555AAA', 2, '2026-04-20', '18:00');
      await booking.createBooking('+1555BBB', 2, '2026-04-19', '19:00');

      const bookings = await booking.getAllBookings();
      expect(bookings[0].phone).to.equal('+1555AAA');
    });
  });
});
