require('dotenv').config();
const mysql = require('mysql2');

// Parsear la MYSQL_URL manualmente
const url = process.env.MYSQL_URL;

if (!url) {
    console.error('❌ MYSQL_URL no está definida');
    process.exit(1);
}

const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

if (!match) {
    console.error('❌ URL inválida');
    process.exit(1);
}

const [, user, password, host, port, database] = match;

console.log('🔧 Configurando pool de conexiones a:', host, 'puerto:', port, 'base:', database);

// Crear POOL de conexiones en lugar de conexión simple
const pool = mysql.createPool({
    host: host,
    port: parseInt(port),
    user: user,
    password: password,
    database: database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 60000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

// Verificar conexión inicial
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Error al conectar:', err.message);
        return;
    }
    console.log('✅ Pool de conexiones MySQL establecido');
    connection.release();
});

// Manejar errores del pool
pool.on('error', (err) => {
    console.error('❌ Error en pool de MySQL:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('⚠️ Conexión perdida, el pool creará una nueva automáticamente');
    }
});

module.exports = pool;