import express from 'express';
import pool from '../db.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get All Users (Admin only)
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, full_name, email, role, department, created_at FROM users ORDER BY created_at DESC');
        res.json({ success: true, users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Update User Role (Admin only)
router.patch('/:id/role', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const userId = req.params.id;
        const { role } = req.body;

        if (!['admin', 'faculty', 'student'].includes(role)) {
            return res.status(400).json({ success: false, error: 'Invalid role' });
        }

        await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
        res.json({ success: true, message: 'User role updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Delete User (Admin only)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const userId = req.params.id;

        // Prevent deleting self
        if (parseInt(userId) === req.user.id) {
            return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
        }

        await pool.query('DELETE FROM users WHERE id = ?', [userId]);
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

export default router;
