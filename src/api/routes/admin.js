/**
 * Admin API Routes
 * Purpose: Admin dashboard endpoints for search, audit, etc.
 */

const express = require('express');
const router = express.Router();

// POST /api/admin/login
// Admin authentication
router.post('/login', (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Not yet implemented (Phase 2)'
  });
});

// GET /api/admin/bookings/search
// Search bookings (admin only)
router.get('/bookings/search', (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Not yet implemented (Phase 2)'
  });
});

module.exports = router;
