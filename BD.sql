-- ===========================================================
-- BASE DE DATOS: empleo_corredor
-- Aplicación de empleo para el corredor ecológico
-- ===========================================================

-- 1️⃣ Crear base de datos
CREATE DATABASE IF NOT EXISTS empleo_corredor
CHARACTER SET utf8mb4
COLLATE utf8mb4_general_ci;

USE empleo_corredor;

-- 2️⃣ Tabla: usuarios
CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    ubicacion VARCHAR(100),
    tipo_usuario ENUM('postulante', 'empresa') NOT NULL,
    contraseña VARCHAR(255) NOT NULL,
    cv VARCHAR(255) NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3️⃣ Tabla: empresas
CREATE TABLE empresas (
    id_empresa INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    nombre_empresa VARCHAR(150) NOT NULL,
    descripcion TEXT,
    sitio_web VARCHAR(120),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- 4️⃣ Tabla: vacantes
CREATE TABLE vacantes (
    id_vacante INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    ubicacion VARCHAR(100) NOT NULL,
    salario DECIMAL(10,2) NULL,
    tipo_contrato VARCHAR(50),
    fecha_publicacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('activa','cerrada') DEFAULT 'activa',
    FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- 5️⃣ Tabla: postulaciones
CREATE TABLE postulaciones (
    id_postulacion INT AUTO_INCREMENT PRIMARY KEY,
    id_vacante INT NOT NULL,
    id_postulante INT NOT NULL,
    fecha_postulacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('pendiente','aceptado','rechazado') DEFAULT 'pendiente',
    mensaje TEXT NULL,
    FOREIGN KEY (id_vacante) REFERENCES vacantes(id_vacante)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (id_postulante) REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- 6️⃣ (Opcional) Tabla: administradores
CREATE TABLE administradores (
    id_admin INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    contraseña VARCHAR(255) NOT NULL
);

-- ===========================================================
-- Ejemplo de inserciones iniciales
-- ===========================================================

-- Usuario empresa
INSERT INTO usuarios (nombre_completo, email, telefono, ubicacion, tipo_usuario, contraseña)
VALUES ('EcoEmpleos S.A.S.', 'contacto@ecoempleos.com', '+57 3100000000', 'Bogotá', 'empresa', '1234');

-- Relacionar la empresa con su usuario
INSERT INTO empresas (id_usuario, nombre_empresa, descripcion, sitio_web)
VALUES (1, 'EcoEmpleos S.A.S.', 'Empresa dedicada al empleo verde.', 'https://ecoempleos.com');

-- Publicar una vacante
INSERT INTO vacantes (id_empresa, titulo, descripcion, ubicacion, salario, tipo_contrato)
VALUES (1, 'Ingeniero Ambiental', 'Se requiere profesional en ingeniería ambiental con experiencia en proyectos sostenibles.', 'Bogotá', 3500000, 'Tiempo completo');

-- Usuario postulante
INSERT INTO usuarios (nombre_completo, email, telefono, ubicacion, tipo_usuario, contraseña)
VALUES ('Juan Pérez', 'juanperez@mail.com', '+57 3111111111', 'Cali', 'postulante', 'abcd');

-- Postulación de ejemplo
INSERT INTO postulaciones (id_vacante, id_postulante, mensaje)
VALUES (1, 2, 'Estoy muy interesado en esta oportunidad laboral.');

-- ===========================================================
-- Fin del script
-- ===========================================================