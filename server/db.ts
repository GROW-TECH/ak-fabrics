import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'xiadot.com',
  user: process.env.DB_USER || 'ak_fabrics',
  password: process.env.DB_PASSWORD || 'ak_fabrics',
  database: process.env.DB_NAME || 'ak_fabrics',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+05:30', // Set timezone to Indian Standard Time
  dateStrings: true // Return dates as strings instead of Date objects
});

// Set timezone for all connections
pool.on('connection', function(connection) {
  connection.query('SET time_zone = "+05:30"');
});

export default pool;
