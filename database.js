require('dotenv').config();
const mysql = require('mysql2');

const connection = mysql.createConnection({
    uri: process.env.MYSQL_PUBLIC_URL,
    connectTimeout: 60000,
    ssl: { rejectUnauthorized: false }
});

connection.connect((err) => {
    if (err) {
        console.error('❌ Error:', err.message);
        return;
    }
    console.log('✅ Conectado a MySQL');
});

module.exports = connection;