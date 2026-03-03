import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDB() {
    console.log('Starting Database Initialization...');

    // Read the SQL schema file
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    let sqlString;
    try {
        sqlString = fs.readFileSync(schemaPath, 'utf8');
    } catch (err) {
        console.error('Could not read database/schema.sql:', err);
        process.exit(1);
    }

    // Connect to MySQL server (without specifying database, since the script creates it)
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true // Required to execute the whole schema.sql at once
        });

        console.log('Connected to MySQL server.');

        // Execute schema
        console.log('Executing schema.sql queries...');
        await connection.query(sqlString);

        console.log('Database initialized successfully!');
        console.log('You can now log in using admin@campus.edu / Admin@123');

    } catch (error) {
        console.error('Failed to initialize database:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
        process.exit(0);
    }
}

initDB();
