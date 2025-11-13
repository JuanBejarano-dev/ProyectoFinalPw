require('dotenv').config();
const mysql = require('mysql2');

// Parsear la MYSQL_PUBLIC_URL manualmente
const url = process.env.MYSQL_PUBLIC_URL;

if (!url) {
    console.error('❌ MYSQL_PUBLIC_URL no está definida');
    process.exit(1);
}

// Extraer componentes de: mysql://user:pass@host:port/database
const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

if (!match) {
    console.error('❌ URL inválida');
    process.exit(1);
}

const [, user, password, host, port, database] = match;

console.log('🔧 Conectando a:', host, 'puerto:', port, 'base:', database);

const connection = mysql.createConnection({
    host: host,
    port: parseInt(port),
    user: user,
    password: password,
    database: database,
    connectTimeout: 60000
});

connection.connect((err) => {
    if (err) {
        console.error('❌ Error:', err.message);
        console.error('Host intentado:', host);
        return;
    }
    console.log('✅ Conectado a MySQL');
});

module.exports = connection;