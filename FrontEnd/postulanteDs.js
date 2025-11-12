// Variables globales
let usuario = null;
let vacantes = [];
let vacantesOriginales = [];
let misPostulaciones = [];

// Verificar sesión al cargar
document.addEventListener('DOMContentLoaded', async function() {
    verificarSesion();
    await cargarVacantes();
    await cargarMisPostulaciones();
    cargarEstadisticas();
    cargarDatosPerfil();
});

function verificarSesion() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const usuarioData = localStorage.getItem('usuario');

    if (!isLoggedIn || !usuarioData) {
        alert('Debes iniciar sesión para acceder a esta página');
        window.location.href = 'login.html';
        return;
    }

    usuario = JSON.parse(usuarioData);

    if (usuario.tipo_usuario !== 'postulante') {
        alert('Esta página es solo para postulantes');
        window.location.href = 'empresaDs.html';
        return;
    }

    document.getElementById('nombrePostulante').textContent = usuario.nombre_completo;
}

async function cargarVacantes() {
    try {
        const response = await fetch('http://localhost:3000/api/vacantes');
        const data = await response.json();

        if (data.success) {
            vacantes = data.data;
            vacantesOriginales = [...data.data];
            mostrarVacantes();
        }
    } catch (error) {
        console.error('Error al cargar vacantes:', error);
    }
}

function mostrarVacantes() {
    const container = document.getElementById('listaVacantes');

    if (vacantes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No hay vacantes disponibles en este momento</p>
            </div>
        `;
        return;
    }

    container.innerHTML = vacantes.map(v => {
        const yaPostulado = misPostulaciones.some(p => p.id_vacante === v.id_vacante);
        
        return `
            <div class="vacante-item">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <h3>${v.titulo}</h3>
                        <p><strong>🏢 Empresa:</strong> ${v.nombre_empresa}</p>
                        <p><strong>📍 Ubicación:</strong> ${v.ubicacion}</p>
                        <p><strong>💼 Tipo:</strong> ${v.tipo_contrato}</p>
                        ${v.salario ? `<p><strong>💰 Salario:</strong> $${Number(v.salario).toLocaleString()}</p>` : ''}
                        <p><strong>📅 Publicada:</strong> ${new Date(v.fecha_publicacion).toLocaleDateString()}</p>
                    </div>
                    <span class="badge badge-active">Activa</span>
                </div>
                <p style="margin-top: 10px; color: #ddd; font-size: 14px;">${v.descripcion.substring(0, 150)}${v.descripcion.length > 150 ? '...' : ''}</p>
                <div class="vacante-actions">
                    <button class="btn btn-primary" onclick="verDetalleVacante(${v.id_vacante})">Ver Detalles</button>
                    ${yaPostulado 
                        ? '<button class="btn btn-success" disabled>✅ Ya Postulado</button>' 
                        : `<button class="btn btn-success" onclick="abrirModalPostular(${v.id_vacante})">Postularme</button>`
                    }
                </div>
            </div>
        `;
    }).join('');
}

function filtrarVacantes() {
    const busqueda = document.getElementById('buscarVacante').value.toLowerCase();
    const tipoFiltro = document.getElementById('filtroTipo').value;

    vacantes = vacantesOriginales.filter(v => {
        const coincideBusqueda = v.titulo.toLowerCase().includes(busqueda) || 
                                 v.ubicacion.toLowerCase().includes(busqueda) ||
                                 v.nombre_empresa.toLowerCase().includes(busqueda);
        
        const coincideTipo = !tipoFiltro || v.tipo_contrato === tipoFiltro;

        return coincideBusqueda && coincideTipo;
    });

    mostrarVacantes();
}

async function verDetalleVacante(idVacante) {
    try {
        const response = await fetch(`http://localhost:3000/api/vacantes/${idVacante}`);
        const data = await response.json();

        if (data.success) {
            const v = data.data;
            alert(`
📋 ${v.titulo}

🏢 Empresa: ${v.nombre_empresa}
${v.descripcion_empresa}

📍 Ubicación: ${v.ubicacion}
💼 Tipo de Contrato: ${v.tipo_contrato}
${v.salario ? `💰 Salario: $${Number(v.salario).toLocaleString()}` : ''}

📝 Descripción del puesto:
${v.descripcion}

📧 Contacto: ${v.email_empresa}
${v.telefono_empresa ? `📱 Teléfono: ${v.telefono_empresa}` : ''}
            `);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al cargar los detalles de la vacante');
    }
}

async function abrirModalPostular(idVacante) {
    const vacante = vacantes.find(v => v.id_vacante === idVacante);
    
    if (!vacante) return;

    document.getElementById('postular_id_vacante').value = idVacante;
    document.getElementById('vacanteDetalle').innerHTML = `
        <h3>${vacante.titulo}</h3>
        <p><strong>🏢 Empresa:</strong> ${vacante.nombre_empresa}</p>
        <p><strong>📍 Ubicación:</strong> ${vacante.ubicacion}</p>
        <p><strong>💼 Tipo:</strong> ${vacante.tipo_contrato}</p>
        ${vacante.salario ? `<p><strong>💰 Salario:</strong> $${Number(vacante.salario).toLocaleString()}</p>` : ''}
    `;
    
    document.getElementById('modalPostular').classList.add('active');
}

document.getElementById('formPostular').addEventListener('submit', async function(e) {
    e.preventDefault();

    const btnSubmit = this.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Enviando...';

    const postulacionData = {
        id_vacante: parseInt(document.getElementById('postular_id_vacante').value),
        id_postulante: usuario.id_usuario,
        mensaje: document.getElementById('postular_mensaje').value.trim()
    };

    try {
        const response = await fetch('http://localhost:3000/api/postulaciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postulacionData)
        });

        const data = await response.json();

        if (data.success) {
            alert('✅ ' + data.message);
            this.reset();
            cerrarModal();
            await cargarMisPostulaciones();
            await cargarVacantes();
            cargarEstadisticas();
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al enviar postulación');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Enviar Postulación';
    }
});

async function cargarMisPostulaciones() {
    try {
        const response = await fetch(`http://localhost:3000/api/postulaciones/postulante/${usuario.id_usuario}`);
        const data = await response.json();

        if (data.success) {
            misPostulaciones = data.data;
            mostrarMisPostulaciones();
        }
    } catch (error) {
        console.error('Error al cargar postulaciones:', error);
    }
}

function mostrarMisPostulaciones() {
    const container = document.getElementById('listaPostulaciones');

    if (misPostulaciones.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Aún no te has postulado a ninguna vacante</p>
                <button class="btn btn-primary" onclick="cambiarTab('vacantes')">Buscar Vacantes</button>
            </div>
        `;
        return;
    }

    container.innerHTML = misPostulaciones.map(p => `
        <div class="postulacion-item">
            <div class="postulacion-header">
                <div>
                    <h3>${p.titulo}</h3>
                    <p style="font-size: 13px; color: #aaa;">
                        🏢 ${p.nombre_empresa} | 📍 ${p.ubicacion}
                    </p>
                </div>
                <span class="badge badge-${p.estado_postulacion === 'aceptado' ? 'accepted' : p.estado_postulacion === 'rechazado' ? 'rejected' : 'pending'}">
                    ${p.estado_postulacion}
                </span>
            </div>
            <p><strong>💼 Tipo:</strong> ${p.tipo_contrato}</p>
            ${p.salario ? `<p><strong>💰 Salario:</strong> $${Number(p.salario).toLocaleString()}</p>` : ''}
            ${p.mensaje ? `<p style="margin: 10px 0; font-style: italic; color: #ddd;">"${p.mensaje}"</p>` : ''}
            <p style="font-size: 12px; color: #888; margin-top: 10px;">
                📅 Postulado: ${new Date(p.fecha_postulacion).toLocaleString()}
            </p>
            ${p.estado_postulacion === 'aceptado' ? `
                <div style="margin-top: 10px; padding: 10px; background: rgba(76, 175, 80, 0.2); border-radius: 5px;">
                    <p style="color: #4CAF50; font-weight: 600;">¡Felicitaciones! Tu postulación ha sido aceptada</p>
                </div>
            ` : ''}
        </div>
    `).join('');
}

function cargarDatosPerfil() {
    document.getElementById('perfil_nombre').value = usuario.nombre_completo;
    document.getElementById('perfil_email').value = usuario.email;
    document.getElementById('perfil_telefono').value = usuario.telefono || '';
    document.getElementById('perfil_ubicacion').value = usuario.ubicacion || '';
    
    if (usuario.cv) {
        document.getElementById('cvActual').textContent = `📄 ${usuario.cv}`;
    } else {
        document.getElementById('cvActual').textContent = 'No has subido un CV';
    }
}

document.getElementById('formPerfil').addEventListener('submit', async function(e) {
    e.preventDefault();

    const btnSubmit = this.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Actualizando...';

    const formData = new FormData();
    formData.append('nombre_completo', document.getElementById('perfil_nombre').value.trim());
    formData.append('telefono', document.getElementById('perfil_telefono').value.trim());
    formData.append('ubicacion', document.getElementById('perfil_ubicacion').value.trim());

    const cvFile = document.getElementById('perfil_cv').files[0];
    if (cvFile) {
        formData.append('cv', cvFile);
    }

    try {
        const response = await fetch(`http://localhost:3000/api/usuarios/${usuario.id_usuario}`, {
            method: 'PUT',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            alert('✅ ' + data.message);
            
            // Actualizar datos del usuario en localStorage
            usuario.telefono = document.getElementById('perfil_telefono').value.trim();
            usuario.ubicacion = document.getElementById('perfil_ubicacion').value.trim();
            if (cvFile) {
                usuario.cv = cvFile.name;
            }
            localStorage.setItem('usuario', JSON.stringify(usuario));
            
            cargarDatosPerfil();
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al actualizar perfil');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Actualizar Perfil';
    }
});

function cambiarTab(tab) {
    // Actualizar tabs
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    // Activar tab seleccionado
    event.target.classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
}

function cargarEstadisticas() {
    const totalPostulaciones = misPostulaciones.length;
    const aceptadas = misPostulaciones.filter(p => p.estado_postulacion === 'aceptado').length;
    const pendientes = misPostulaciones.filter(p => p.estado_postulacion === 'pendiente').length;

    document.getElementById('totalPostulaciones').textContent = totalPostulaciones;
    document.getElementById('totalAceptadas').textContent = aceptadas;
    document.getElementById('totalPendientes').textContent = pendientes;
}

function cerrarModal() {
    document.getElementById('modalPostular').classList.remove('active');
}

function cerrarSesion() {
    if (confirm('¿Deseas cerrar sesión?')) {
        localStorage.removeItem('usuario');
        localStorage.removeItem('isLoggedIn');
        window.location.href = 'login.html';
    }
}

// Cerrar modal al hacer click fuera
window.onclick = function(event) {
    const modal = document.getElementById('modalPostular');
    if (event.target === modal) {
        cerrarModal();
    }
}