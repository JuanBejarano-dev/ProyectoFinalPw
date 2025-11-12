// Configuración de la API
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : ''; // En producción usa la misma URL

// Exportar para usar en otros archivos
const config = {
    apiUrl: API_URL
};