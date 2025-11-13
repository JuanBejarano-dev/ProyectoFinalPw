require('dotenv').config();
const mysql = require('mysql2');

const connection = mysql.createConnection(
    process.env.MYSQL_PUBLIC_URL || {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    }
);

connection.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
        return;
    }
    console.log('Conexión a la base de datos establecida.');
    console.log('Base de datos:', process.env.DB_NAME || 'railway');
});

module.exports = connection;