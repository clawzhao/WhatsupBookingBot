const express = require('express');
const router = express.Router();

router.get('/students', (req, res) => {
  const q = req.query.q || '';
  res.json({ students: [{ name: q, phone: '+92300000000', bookings: 5, cancellation_rate: 0.2 }] });
});

router.get('/coaches', (req, res) => {
  const q = req.query.q || '';
  res.json({ coaches: [{ name: q, email: 'coach@test.com', performance: 85 }] });
});

router.get('/chats', (req, res) => {
  const q = req.query.q || '';
  res.json({ messages: [{ text: q, sender: 'student', date: new Date() }] });
});

router.get('/bookings/:id', (req, res) => {
  res.json({ id: req.params.id, status: 'confirmed' });
});

router.put('/bookings/:id/suspend', (req, res) => {
  res.json({ id: req.params.id, status: 'suspended' });
});

router.patch('/bookings/:id', (req, res) => {
  res.json({ id: req.params.id, updated: true });
});

module.exports = router;
