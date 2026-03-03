import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db.js';

const router = express.Router();

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }

        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        req.session.user = {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            department: user.department
        };

        res.json({
            success: true,
            user: req.session.user
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

router.post('/register', async (req, res) => {
    try {
        const { full_name, email, password, department, role } = req.body;
        if (!full_name || !email || !password || !department) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }

        // Only allow student and faculty registration from public form. Admin must be created by db seed or superadmin.
        const assignRole = (role === 'faculty') ? 'faculty' : 'student';

        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, error: 'Email already in use' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await pool.query(
            'INSERT INTO users (full_name, email, password, role, department) VALUES (?, ?, ?, ?, ?)',
            [full_name, email, hashedPassword, assignRole, department]
        );

        req.session.user = {
            id: result.insertId,
            full_name,
            email,
            role: assignRole,
            department
        };

        res.json({
            success: true,
            user: req.session.user
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Could not log out' });
        res.json({ success: true });
    });
});

router.get('/me', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ success: true, user: req.session.user });
    } else {
        res.status(401).json({ success: false, error: 'Not authenticated' });
    }
});

export default router;
