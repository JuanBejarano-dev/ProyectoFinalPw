const express = require('express');
const connection = require('./database');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcrypt');
const{ connect } = require('http2');
const fs = require('fs');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'FrontEnd')));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/cvs/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'cv-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, 
    fileFilter: function (req, file, cb) {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF'));
        }
    }
});

// CRUD DE USUARIOS

// CREATE - Registro de nuevo usuario
app.post('/api/usuarios/registro', upload.single('cv'), async (req, res) => {
    try {
        const { nombre_completo, email, telefono, ubicacion, tipo_usuario, contrasena } = req.body;

        // Validaciones básicas
        if (!nombre_completo || !email || !tipo_usuario || !contrasena) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios'
            });
        }

        // Verificar si el email ya existe
        const [existingUser] = await connection.promise().query(
            'SELECT email FROM usuarios WHERE email = ?',
            [email]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'El correo electrónico ya está registrado'
            });
        }

        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(contrasena, 10);

        // Convertir CV a Base64
        let cvBase64 = null;
        if (req.file) {
            const fileBuffer = fs.readFileSync(req.file.path);
            cvBase64 = fileBuffer.toString('base64');
            fs.unlinkSync(req.file.path); // Eliminar archivo temporal
        }

        // Insertar usuario
        const [result] = await connection.promise().query(
            `INSERT INTO usuarios (nombre_completo, email, telefono, ubicacion, tipo_usuario, contraseña, cv_data)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [nombre_completo, email, telefono, ubicacion, tipo_usuario, hashedPassword, cvBase64]
        );

        // Si es empresa, crear registro en tabla empresas
        if (tipo_usuario === 'empresa') {
            await connection.promise().query(
                `INSERT INTO empresas (id_usuario, nombre_empresa, descripcion)
                VALUES (?, ?, ?)`,
                [result.insertId, nombre_completo, 'Descripción pendiente']
            );
        }

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            data: {
                id_usuario: result.insertId,
                nombre_completo,
                email,
                tipo_usuario
            }
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar usuario',
            error: error.message
        });
    }
});

// READ - Obtener todos los usuarios
app.get('/api/usuarios', async (req, res) => {
    try {
        const [usuarios] = await connection.promise().query(
            `SELECT id_usuario, nombre_completo, email, telefono, ubicacion, tipo_usuario, 
                    cv, fecha_registro 
            FROM usuarios
            ORDER BY fecha_registro DESC`
        );

        res.status(200).json({
            success: true,
            count: usuarios.length,
            data: usuarios
        });

    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuarios',
            error: error.message
        });
    }
});

// READ - Obtener usuario por ID
app.get('/api/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [usuario] = await connection.promise().query(
            `SELECT id_usuario, nombre_completo, email, telefono, ubicacion, tipo_usuario, 
                    cv, fecha_registro 
            FROM usuarios 
            WHERE id_usuario = ?`,
            [id]
        );

        if (usuario.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.status(200).json({
            success: true,
            data: usuario[0]
        });

    } catch (error) {
        console.error('Error al obtener usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuario',
            error: error.message
        });
    }
});

// UPDATE - Actualizar usuario
app.put('/api/usuarios/:id', upload.single('cv'), async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_completo, telefono, ubicacion } = req.body;

        // Verificar que el usuario existe
        const [usuario] = await connection.promise().query(
            'SELECT id_usuario FROM usuarios WHERE id_usuario = ?',
            [id]
        );

        if (usuario.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Construir query dinámicamente
        let updateFields = [];
        let updateValues = [];

        if (nombre_completo) {
            updateFields.push('nombre_completo = ?');
            updateValues.push(nombre_completo);
        }
        if (telefono) {
            updateFields.push('telefono = ?');
            updateValues.push(telefono);
        }
        if (ubicacion) {
            updateFields.push('ubicacion = ?');
            updateValues.push(ubicacion);
        }
        if (req.file) {
            updateFields.push('cv = ?');
            updateValues.push(req.file.filename);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No hay campos para actualizar'
            });
        }

        updateValues.push(id);

        await connection.promise().query(
            `UPDATE usuarios SET ${updateFields.join(', ')} WHERE id_usuario = ?`,
            updateValues
        );

        res.status(200).json({
            success: true,
            message: 'Usuario actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar usuario',
            error: error.message
        });
    }
});

// DELETE - Eliminar usuario
app.delete('/api/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el usuario existe
        const [usuario] = await connection.promise().query(
            'SELECT id_usuario FROM usuarios WHERE id_usuario = ?',
            [id]
        );

        if (usuario.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Eliminar usuario (CASCADE eliminará registros relacionados)
        await connection.promise().query(
            'DELETE FROM usuarios WHERE id_usuario = ?',
            [id]
        );

        res.status(200).json({
            success: true,
            message: 'Usuario eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar usuario',
            error: error.message
        });
    }
});

// ==========================================
// LOGIN
// ==========================================

app.post('/api/usuarios/login', async (req, res) => {
    try {
        const { email, contrasena } = req.body;

        if (!email || !contrasena) {
            return res.status(400).json({
                success: false,
                message: 'Email y contraseña son requeridos'
            });
        }

        // Buscar usuario
        const [usuarios] = await connection.promise().query(
            'SELECT * FROM usuarios WHERE email = ?',
            [email]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        const usuario = usuarios[0];

        // Verificar contraseña
        const passwordMatch = await bcrypt.compare(contrasena, usuario.contraseña);

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Login exitoso
        res.status(200).json({
            success: true,
            message: 'Login exitoso',
            data: {
                id_usuario: usuario.id_usuario,
                nombre_completo: usuario.nombre_completo,
                email: usuario.email,
                tipo_usuario: usuario.tipo_usuario
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor',
            error: error.message
        });
    }
});

// 1️⃣ CREATE - Crear nueva vacante (solo empresas)
app.post('/api/vacantes', async (req, res) => {
    try {
        const { id_empresa, titulo, descripcion, ubicacion, salario, tipo_contrato } = req.body;

        if (!id_empresa || !titulo || !descripcion || !ubicacion) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios'
            });
        }

        // Verificar que la empresa existe
        const [empresa] = await connection.promise().query(
            'SELECT id_empresa FROM empresas WHERE id_empresa = ?',
            [id_empresa]
        );

        if (empresa.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Empresa no encontrada'
            });
        }

        const [result] = await connection.promise().query(
            `INSERT INTO vacantes (id_empresa, titulo, descripcion, ubicacion, salario, tipo_contrato)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id_empresa, titulo, descripcion, ubicacion, salario, tipo_contrato]
        );

        res.status(201).json({
            success: true,
            message: 'Vacante creada exitosamente',
            data: {
                id_vacante: result.insertId,
                titulo,
                ubicacion
            }
        });

    } catch (error) {
        console.error('Error al crear vacante:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear vacante',
            error: error.message
        });
    }
});

// 2️⃣ READ - Obtener todas las vacantes activas
app.get('/api/vacantes', async (req, res) => {
    try {
        const [vacantes] = await connection.promise().query(
            `SELECT v.*, e.nombre_empresa, u.ubicacion as ubicacion_empresa
             FROM vacantes v
             INNER JOIN empresas e ON v.id_empresa = e.id_empresa
             INNER JOIN usuarios u ON e.id_usuario = u.id_usuario
             WHERE v.estado = 'activa'
             ORDER BY v.fecha_publicacion DESC`
        );

        res.status(200).json({
            success: true,
            count: vacantes.length,
            data: vacantes
        });

    } catch (error) {
        console.error('Error al obtener vacantes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener vacantes',
            error: error.message
        });
    }
});

// 3️⃣ READ - Obtener vacantes de una empresa específica
app.get('/api/vacantes/empresa/:id_empresa', async (req, res) => {
    try {
        const { id_empresa } = req.params;

        const [vacantes] = await connection.promise().query(
            `SELECT v.*, 
                    COUNT(DISTINCT p.id_postulacion) as total_postulaciones
             FROM vacantes v
             LEFT JOIN postulaciones p ON v.id_vacante = p.id_vacante
             WHERE v.id_empresa = ?
             GROUP BY v.id_vacante
             ORDER BY v.fecha_publicacion DESC`,
            [id_empresa]
        );

        res.status(200).json({
            success: true,
            count: vacantes.length,
            data: vacantes
        });

    } catch (error) {
        console.error('Error al obtener vacantes de empresa:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener vacantes',
            error: error.message
        });
    }
});

// 4️⃣ READ - Obtener vacante por ID
app.get('/api/vacantes/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [vacante] = await connection.promise().query(
            `SELECT v.*, e.nombre_empresa, e.descripcion as descripcion_empresa,
                    u.email as email_empresa, u.telefono as telefono_empresa
             FROM vacantes v
             INNER JOIN empresas e ON v.id_empresa = e.id_empresa
             INNER JOIN usuarios u ON e.id_usuario = u.id_usuario
             WHERE v.id_vacante = ?`,
            [id]
        );

        if (vacante.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Vacante no encontrada'
            });
        }

        res.status(200).json({
            success: true,
            data: vacante[0]
        });

    } catch (error) {
        console.error('Error al obtener vacante:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener vacante',
            error: error.message
        });
    }
});

// 5️⃣ UPDATE - Actualizar vacante
app.put('/api/vacantes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, descripcion, ubicacion, salario, tipo_contrato, estado } = req.body;

        const [vacante] = await connection.promise().query(
            'SELECT id_vacante FROM vacantes WHERE id_vacante = ?',
            [id]
        );

        if (vacante.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Vacante no encontrada'
            });
        }

        let updateFields = [];
        let updateValues = [];

        if (titulo) {
            updateFields.push('titulo = ?');
            updateValues.push(titulo);
        }
        if (descripcion) {
            updateFields.push('descripcion = ?');
            updateValues.push(descripcion);
        }
        if (ubicacion) {
            updateFields.push('ubicacion = ?');
            updateValues.push(ubicacion);
        }
        if (salario !== undefined) {
            updateFields.push('salario = ?');
            updateValues.push(salario);
        }
        if (tipo_contrato) {
            updateFields.push('tipo_contrato = ?');
            updateValues.push(tipo_contrato);
        }
        if (estado) {
            updateFields.push('estado = ?');
            updateValues.push(estado);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No hay campos para actualizar'
            });
        }

        updateValues.push(id);

        await connection.promise().query(
            `UPDATE vacantes SET ${updateFields.join(', ')} WHERE id_vacante = ?`,
            updateValues
        );

        res.status(200).json({
            success: true,
            message: 'Vacante actualizada exitosamente'
        });

    } catch (error) {
        console.error('Error al actualizar vacante:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar vacante',
            error: error.message
        });
    }
});

// 6️⃣ DELETE - Eliminar vacante
app.delete('/api/vacantes/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [vacante] = await connection.promise().query(
            'SELECT id_vacante FROM vacantes WHERE id_vacante = ?',
            [id]
        );

        if (vacante.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Vacante no encontrada'
            });
        }

        await connection.promise().query(
            'DELETE FROM vacantes WHERE id_vacante = ?',
            [id]
        );

        res.status(200).json({
            success: true,
            message: 'Vacante eliminada exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar vacante:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar vacante',
            error: error.message
        });
    }
});

// CRUD DE POSTULACIONES

// CREATE - Postularse a una vacante
app.post('/api/postulaciones', async (req, res) => {
    try {
        const { id_vacante, id_postulante, mensaje } = req.body;

        if (!id_vacante || !id_postulante) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios'
            });
        }

        // Verificar que la vacante existe y está activa
        const [vacante] = await connection.promise().query(
            'SELECT estado FROM vacantes WHERE id_vacante = ?',
            [id_vacante]
        );

        if (vacante.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Vacante no encontrada'
            });
        }

        if (vacante[0].estado !== 'activa') {
            return res.status(400).json({
                success: false,
                message: 'Esta vacante ya no está activa'
            });
        }

        // Verificar que no se haya postulado antes
        const [postulacionExistente] = await connection.promise().query(
            'SELECT id_postulacion FROM postulaciones WHERE id_vacante = ? AND id_postulante = ?',
            [id_vacante, id_postulante]
        );

        if (postulacionExistente.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Ya te has postulado a esta vacante'
            });
        }

        const [result] = await connection.promise().query(
            `INSERT INTO postulaciones (id_vacante, id_postulante, mensaje)
            VALUES (?, ?, ?)`,
            [id_vacante, id_postulante, mensaje]
        );

        res.status(201).json({
            success: true,
            message: 'Postulación enviada exitosamente',
            data: {
                id_postulacion: result.insertId
            }
        });

    } catch (error) {
        console.error('Error al crear postulación:', error);
        res.status(500).json({
            success: false,
            message: 'Error al enviar postulación',
            error: error.message
        });
    }
});

// READ - Obtener postulaciones de un postulante
app.get('/api/postulaciones/postulante/:id_postulante', async (req, res) => {
    try {
        const { id_postulante } = req.params;

        const [postulaciones] = await connection.promise().query(
            `SELECT p.*, v.titulo, v.ubicacion, v.salario, v.tipo_contrato,
                    e.nombre_empresa,
                    p.fecha_postulacion, p.estado as estado_postulacion
            FROM postulaciones p
            INNER JOIN vacantes v ON p.id_vacante = v.id_vacante
            INNER JOIN empresas e ON v.id_empresa = e.id_empresa
            WHERE p.id_postulante = ?
            ORDER BY p.fecha_postulacion DESC`,
            [id_postulante]
        );

        res.status(200).json({
            success: true,
            count: postulaciones.length,
            data: postulaciones
        });

    } catch (error) {
        console.error('Error al obtener postulaciones del postulante:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener postulaciones',
            error: error.message
        });
    }
});

// 3️⃣ READ - Obtener postulaciones de una vacante (para empresa)
app.get('/api/postulaciones/vacante/:id_vacante', async (req, res) => {
    try {
        const { id_vacante } = req.params;

        const [postulaciones] = await connection.promise().query(
            `SELECT p.*, u.nombre_completo, u.email, u.telefono, u.ubicacion, u.cv,
                    p.fecha_postulacion, p.estado as estado_postulacion, p.mensaje
            FROM postulaciones p
            INNER JOIN usuarios u ON p.id_postulante = u.id_usuario
            WHERE p.id_vacante = ?
            ORDER BY p.fecha_postulacion DESC`,
            [id_vacante]
        );

        res.status(200).json({
            success: true,
            count: postulaciones.length,
            data: postulaciones
        });

    } catch (error) {
        console.error('Error al obtener postulaciones de la vacante:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener postulaciones',
            error: error.message
        });
    }
});

// UPDATE - Cambiar estado de postulación (aceptar/rechazar)
app.put('/api/postulaciones/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!estado || !['pendiente', 'aceptado', 'rechazado'].includes(estado)) {
            return res.status(400).json({
                success: false,
                message: 'Estado inválido. Debe ser: pendiente, aceptado o rechazado'
            });
        }

        const [postulacion] = await connection.promise().query(
            'SELECT id_postulacion FROM postulaciones WHERE id_postulacion = ?',
            [id]
        );

        if (postulacion.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Postulación no encontrada'
            });
        }

        await connection.promise().query(
            'UPDATE postulaciones SET estado = ? WHERE id_postulacion = ?',
            [estado, id]
        );

        res.status(200).json({
            success: true,
            message: `Postulación ${estado} exitosamente`
        });

    } catch (error) {
        console.error('Error al actualizar postulación:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar postulación',
            error: error.message
        });
    }
});

// Obtener ID de empresa del usuario logueado
app.get('/api/empresas/usuario/:id_usuario', async (req, res) => {
    try {
        const { id_usuario } = req.params;

        const [empresa] = await connection.promise().query(
            'SELECT * FROM empresas WHERE id_usuario = ?',
            [id_usuario]
        );

        if (empresa.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Empresa no encontrada'
            });
        }

        res.status(200).json({
            success: true,
            data: empresa[0]
        });

    } catch (error) {
        console.error('Error al obtener empresa:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener empresa',
            error: error.message
        });
    }
});

// Ruta raíz -> redirige al login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'FrontEnd', 'login.html'));
});

// MANEJO DE ERRORES

// Ruta no encontrada
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Error en el servidor',
        error: err.message
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en ${PORT}`);
    console.log(`Base de datos: empleo_corredor`);
});