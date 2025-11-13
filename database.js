require('dotenv').config();
const mysql = require('mysql2');

// Intentar con cualquier variable disponible
const url = process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL;

console.log('🔍 Variables disponibles:');
console.log('MYSQL_URL:', !!process.env.MYSQL_URL);
console.log('MYSQL_PUBLIC_URL:', !!process.env.MYSQL_PUBLIC_URL);
console.log('DB_HOST:', process.env.DB_HOST);

if (!url) {
    console.error('❌ No hay URL de MySQL disponible, usando fallback');
    // Fallback a variables individuales
    const connection = mysql.createConnection({
        host: process.env.DB_HOST || 'mysql.railway.internal',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'railway',
        connectTimeout: 60000
    });
    
    connection.connect((err) => {
        if (err) {
            console.error('❌ Error:', err.message);
            return;
        }
        console.log('✅ Conectado con variables individuales');
    });
    
    module.exports = connection;
} else {
    // Parsear URL
    const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    
    if (!match) {
        console.error('❌ URL inválida');
        module.exports = null;
        return;
    }
    
    const [, user, password, host, port, database] = match;
    
    console.log('🔧 Conectando a:', host, 'puerto:', port);
    
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
            return;
        }
        console.log('✅ Conectado a MySQL');
    });
    
    module.exports = connection;
}