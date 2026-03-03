import express from 'express';
import pool from '../db.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Register for Event
router.post('/:eventId', requireAuth, async (req, res) => {
    try {
        const eventId = req.params.eventId;
        const userId = req.user.id;

        if (req.user.role !== 'student' && req.user.role !== 'faculty') {
            return res.status(403).json({ success: false, error: 'Only students and faculty can register for events.' });
        }

        const [events] = await pool.query('SELECT * FROM events WHERE id = ?', [eventId]);
        if (events.length === 0) return res.status(404).json({ success: false, error: 'Event not found' });

        const event = events[0];

        if (new Date(event.registration_deadline) < new Date()) {
            return res.status(400).json({ success: false, error: 'Registration deadline has passed' });
        }

        const [regCountRow] = await pool.query('SELECT COUNT(*) as count FROM registrations WHERE event_id = ? AND status != ?', [eventId, 'cancelled']);
        if (regCountRow[0].count >= event.max_capacity) {
            return res.status(400).json({ success: false, error: 'Event is at maximum capacity' });
        }

        try {
            await pool.query('INSERT INTO registrations (event_id, user_id, status) VALUES (?, ?, ?)', [eventId, userId, 'confirmed']);
            res.json({ success: true });
        } catch (insertErr) {
            if (insertErr.code === 'ER_DUP_ENTRY') {
                // Find if it was cancelled, maybe they are re-registering
                const [existing] = await pool.query('SELECT status FROM registrations WHERE event_id = ? AND user_id = ?', [eventId, userId]);
                if (existing.length > 0 && existing[0].status === 'cancelled') {
                    await pool.query('UPDATE registrations SET status = ?, registered_at = CURRENT_TIMESTAMP WHERE event_id = ? AND user_id = ?', ['confirmed', eventId, userId]);
                    return res.json({ success: true, message: 'Re-registered successfully' });
                }
                return res.status(400).json({ success: false, error: 'Already registered' });
            }
            throw insertErr;
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// My Registrations
router.get('/my', requireAuth, async (req, res) => {
    try {
        const query = `
      SELECT r.id as reg_id, r.status as reg_status, r.registered_at, e.* 
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      WHERE r.user_id = ? AND r.status != 'cancelled'
      ORDER BY e.event_date ASC
    `;
        const [registrations] = await pool.query(query, [req.user.id]);
        res.json({ success: true, registrations });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Cancel Registration
router.delete('/:eventId', requireAuth, async (req, res) => {
    try {
        const eventId = req.params.eventId;
        await pool.query('UPDATE registrations SET status = ? WHERE event_id = ? AND user_id = ?', ['cancelled', eventId, req.user.id]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Get Event Registrants (Admin/Faculty)
router.get('/event/:eventId', requireAuth, requireRole('admin', 'faculty'), async (req, res) => {
    try {
        const eventId = req.params.eventId;
        // Check if faculty owns the event or is admin
        const [events] = await pool.query('SELECT created_by FROM events WHERE id = ?', [eventId]);
        if (events.length === 0) return res.status(404).json({ success: false, error: 'Event not found' });

        if (req.user.role !== 'admin' && events[0].created_by !== req.user.id) {
            return res.status(403).json({ success: false, error: 'Not authorized to view registrants for this event' });
        }

        const query = `
      SELECT r.registered_at, u.full_name, u.email, u.department 
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      WHERE r.event_id = ? AND r.status != 'cancelled'
      ORDER BY r.registered_at DESC
    `;
        const [registrants] = await pool.query(query, [eventId]);
        res.json({ success: true, registrants });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

export default router;
