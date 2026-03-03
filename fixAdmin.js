import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

async function fixAdmin() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'campus_events'
    });

    const hash = await bcrypt.hash('Admin@123', 10);
    await connection.query('UPDATE users SET password = ? WHERE email = "admin@campus.edu"', [hash]);

    const [users] = await connection.query('SELECT * FROM users');
    console.log(users);

    await connection.end();
}
fixAdmin().catch(console.error);
