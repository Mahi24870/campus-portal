import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../uploads');

// Ensure upload dir exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Public GET all events
router.get('/', async (req, res) => {
    try {
        const query = `
      SELECT e.*, u.full_name as creator_name,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status != 'cancelled') as registration_count
      FROM events e
      JOIN users u ON e.created_by = u.id
      ORDER BY e.event_date ASC, e.event_time ASC
    `;
        const [events] = await pool.query(query);
        res.json({ success: true, events });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// My Created Events
router.get('/my/created', requireAuth, requireRole('admin', 'faculty'), async (req, res) => {
    try {
        const query = `
      SELECT e.*, 
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status != 'cancelled') as registration_count
      FROM events e
      WHERE e.created_by = ?
      ORDER BY e.created_at DESC
    `;
        const [events] = await pool.query(query, [req.user.id]);
        res.json({ success: true, events });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Single Event Details
router.get('/:id', async (req, res) => {
    try {
        const query = `
      SELECT e.*, u.full_name as creator_name,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status != 'cancelled') as registration_count
      FROM events e
      JOIN users u ON e.created_by = u.id
      WHERE e.id = ?
    `;
        const [events] = await pool.query(query, [req.params.id]);
        if (events.length === 0) return res.status(404).json({ success: false, error: 'Event not found' });

        res.json({ success: true, event: events[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Create Event
router.post('/', requireAuth, requireRole('admin', 'faculty'), upload.single('banner'), async (req, res) => {
    try {
        const { title, description, category, venue, event_date, event_time, registration_deadline, max_capacity } = req.body;
        let banner_url = null;
        if (req.file) {
            banner_url = `/uploads/${req.file.filename}`;
        }

        const [result] = await pool.query(
            `INSERT INTO events (title, description, category, venue, event_date, event_time, registration_deadline, max_capacity, banner_url, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description, category, venue, event_date, event_time, registration_deadline, max_capacity || 100, banner_url, req.user.id]
        );

        res.json({ success: true, eventId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Edit Event
router.patch('/:id', requireAuth, requireRole('admin', 'faculty'), upload.single('banner'), async (req, res) => {
    try {
        // Check ownership
        const [existing] = await pool.query('SELECT created_by FROM events WHERE id = ?', [req.params.id]);
        if (existing.length === 0) return res.status(404).json({ success: false, error: 'Event not found' });

        if (req.user.role !== 'admin' && existing[0].created_by !== req.user.id) {
            return res.status(403).json({ success: false, error: 'Not authorized to edit this event' });
        }

        const { title, description, category, venue, event_date, event_time, registration_deadline, max_capacity, status } = req.body;

        let updates = [];
        let params = [];

        if (title) { updates.push('title = ?'); params.push(title); }
        if (description) { updates.push('description = ?'); params.push(description); }
        if (category) { updates.push('category = ?'); params.push(category); }
        if (venue) { updates.push('venue = ?'); params.push(venue); }
        if (event_date) { updates.push('event_date = ?'); params.push(event_date); }
        if (event_time) { updates.push('event_time = ?'); params.push(event_time); }
        if (registration_deadline) { updates.push('registration_deadline = ?'); params.push(registration_deadline); }
        if (max_capacity) { updates.push('max_capacity = ?'); params.push(max_capacity); }
        if (status) { updates.push('status = ?'); params.push(status); }
        if (req.file) { updates.push('banner_url = ?'); params.push(`/uploads/${req.file.filename}`); }

        if (updates.length > 0) {
            params.push(req.params.id);
            await pool.query(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`, params);
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Delete Event
router.delete('/:id', requireAuth, requireRole('admin', 'faculty'), async (req, res) => {
    try {
        const [existing] = await pool.query('SELECT created_by FROM events WHERE id = ?', [req.params.id]);
        if (existing.length === 0) return res.status(404).json({ success: false, error: 'Event not found' });

        if (req.user.role !== 'admin' && existing[0].created_by !== req.user.id) {
            return res.status(403).json({ success: false, error: 'Not authorized to delete this event' });
        }

        await pool.query('DELETE FROM events WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

export default router;
