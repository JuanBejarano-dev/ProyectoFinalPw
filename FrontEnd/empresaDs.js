// Variables globales
let usuario = null;
let empresa = null;
let vacantes = [];

// Verificar sesión al cargar
document.addEventListener('DOMContentLoaded', async function() {
    verificarSesion();
    await cargarDatosEmpresa();
    await cargarVacantes();
    cargarEstadisticas();
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

    if (usuario.tipo_usuario !== 'empresa') {
        alert('Esta página es solo para empresas');
        window.location.href = 'dashboard-postulante.html';
        return;
    }

    document.getElementById('nombreEmpresa').textContent = usuario.nombre_completo;
}

async function cargarDatosEmpresa() {
    try {
        const response = await fetch(`http://localhost:3000/api/empresas/usuario/${usuario.id_usuario}`);
        const data = await response.json();

        if (data.success) {
            empresa = data.data;
        } else {
            console.error('Error al cargar datos de empresa:', data.message);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function cargarVacantes() {
    if (!empresa) return;

    try {
        const response = await fetch(`http://localhost:3000/api/vacantes/empresa/${empresa.id_empresa}`);
        const data = await response.json();

        if (data.success) {
            vacantes = data.data;
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
                <p>No has publicado ninguna vacante aún</p>
                <button class="btn btn-primary" onclick="cambiarTab('crear')">Crear Primera Vacante</button>
            </div>
        `;
        return;
    }

    container.innerHTML = vacantes.map(v => `
        <div class="vacante-item">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <h3>${v.titulo}</h3>
                    <p><strong>📍 Ubicación:</strong> ${v.ubicacion}</p>
                    <p><strong>💼 Tipo:</strong> ${v.tipo_contrato}</p>
                    ${v.salario ? `<p><strong>💰 Salario:</strong> $${Number(v.salario).toLocaleString()}</p>` : ''}
                    <p><strong>📅 Publicada:</strong> ${new Date(v.fecha_publicacion).toLocaleDateString()}</p>
                    <p><strong>👥 Postulaciones:</strong> ${v.total_postulaciones || 0}</p>
                </div>
                <span class="badge badge-${v.estado === 'activa' ? 'active' : 'closed'}">
                    ${v.estado === 'activa' ? 'Activa' : 'Cerrada'}
                </span>
            </div>
            <div class="vacante-actions">
                <button class="btn btn-secondary" onclick="verPostulaciones(${v.id_vacante}, '${v.titulo}')">
                    Ver Postulaciones (${v.total_postulaciones || 0})
                </button>
                <button class="btn btn-primary" onclick="cambiarEstadoVacante(${v.id_vacante}, '${v.estado === 'activa' ? 'cerrada' : 'activa'}')">
                    ${v.estado === 'activa' ? 'Cerrar' : 'Reactivar'}
                </button>
                <button class="btn btn-danger" onclick="eliminarVacante(${v.id_vacante})">Eliminar</button>
            </div>
        </div>
    `).join('');
}

function cambiarTab(tab) {
    // Actualizar tabs
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    // Activar tab seleccionado
    event.target.classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');

    // Cargar datos según el tab
    if (tab === 'postulaciones') {
        cargarTodasPostulaciones();
    }
}

// Crear vacante
document.getElementById('formCrearVacante').addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!empresa) {
        alert('Error: No se encontró información de la empresa');
        return;
    }

    const btnSubmit = this.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Publicando...';

    const vacanteData = {
        id_empresa: empresa.id_empresa,
        titulo: document.getElementById('titulo').value.trim(),
        descripcion: document.getElementById('descripcion').value.trim(),
        ubicacion: document.getElementById('ubicacion').value.trim(),
        salario: document.getElementById('salario').value || null,
        tipo_contrato: document.getElementById('tipo_contrato').value
    };

    try {
        const response = await fetch('http://localhost:3000/api/vacantes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vacanteData)
        });

        const data = await response.json();

        if (data.success) {
            alert('✅ ' + data.message);
            this.reset();
            await cargarVacantes();
            cargarEstadisticas();
            cambiarTab('mis-vacantes');
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al crear vacante');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Publicar Vacante';
    }
});

async function cambiarEstadoVacante(id, nuevoEstado) {
    if (!confirm(`¿Deseas ${nuevoEstado === 'cerrada' ? 'cerrar' : 'reactivar'} esta vacante?`)) return;

    try {
        const response = await fetch(`http://localhost:3000/api/vacantes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado })
        });

        const data = await response.json();

        if (data.success) {
            alert('✅ ' + data.message);
            await cargarVacantes();
            cargarEstadisticas();
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al actualizar vacante');
    }
}

async function eliminarVacante(id) {
    if (!confirm('¿Estás seguro de eliminar esta vacante? Esta acción no se puede deshacer.')) return;

    try {
        const response = await fetch(`http://localhost:3000/api/vacantes/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            alert('✅ ' + data.message);
            await cargarVacantes();
            cargarEstadisticas();
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al eliminar vacante');
    }
}

async function verPostulaciones(idVacante, tituloVacante) {
    try {
        const response = await fetch(`http://localhost:3000/api/postulaciones/vacante/${idVacante}`);
        const data = await response.json();

        if (data.success) {
            mostrarModalPostulaciones(data.data, tituloVacante);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al cargar postulaciones');
    }
}

function mostrarModalPostulaciones(postulaciones, titulo) {
    const modal = document.getElementById('modalPostulaciones');
    const modalTitulo = document.getElementById('modalTitulo');
    const modalContenido = document.getElementById('modalContenido');

    modalTitulo.textContent = `Postulaciones para: ${titulo}`;

    if (postulaciones.length === 0) {
        modalContenido.innerHTML = '<p style="text-align:center; color:#888;">No hay postulaciones aún</p>';
    } else {
        modalContenido.innerHTML = postulaciones.map(p => `
            <div class="postulacion-item">
                <div class="postulacion-header">
                    <div>
                        <h3 style="margin-bottom: 5px;">${p.nombre_completo}</h3>
                        <p style="font-size: 13px; color: #aaa;">
                            📧 ${p.email} | 📱 ${p.telefono || 'N/A'} | 📍 ${p.ubicacion}
                        </p>
                    </div>
                    <span class="badge badge-${p.estado_postulacion === 'aceptado' ? 'accepted' : p.estado_postulacion === 'rechazado' ? 'rejected' : 'pending'}">
                        ${p.estado_postulacion}
                    </span>
                </div>
                ${p.mensaje ? `<p style="margin: 10px 0; font-style: italic; color: #ddd;">"${p.mensaje}"</p>` : ''}
                <p style="font-size: 12px; color: #888;">Postulado: ${new Date(p.fecha_postulacion).toLocaleString()}</p>
                ${p.cv ? `<p><a href="http://localhost:3000/uploads/cvs/${p.cv}" target="_blank" class="btn btn-secondary" style="display: inline-block; margin-top: 10px; text-decoration: none;">📄 Ver CV</a></p>` : ''}
                <div style="margin-top: 10px; display: flex; gap: 10px;">
                    ${p.estado_postulacion === 'pendiente' ? `
                        <button class="btn btn-primary" onclick="cambiarEstadoPostulacion(${p.id_postulacion}, 'aceptado')">✅ Aceptar</button>
                        <button class="btn btn-danger" onclick="cambiarEstadoPostulacion(${p.id_postulacion}, 'rechazado')">❌ Rechazar</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    modal.classList.add('active');
}

function cerrarModal() {
    document.getElementById('modalPostulaciones').classList.remove('active');
}

async function cambiarEstadoPostulacion(id, estado) {
    try {
        const response = await fetch(`http://localhost:3000/api/postulaciones/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado })
        });

        const data = await response.json();

        if (data.success) {
            alert('✅ ' + data.message);
            cerrarModal();
            cargarVacantes();
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al actualizar postulación');
    }
}

async function cargarTodasPostulaciones() {
    const container = document.getElementById('listaPostulaciones');
    container.innerHTML = '<p style="text-align:center;">Cargando...</p>';

    if (vacantes.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No tienes vacantes publicadas</p></div>';
        return;
    }

    container.innerHTML = '';

    for (const vacante of vacantes) {
        try {
            const response = await fetch(`http://localhost:3000/api/postulaciones/vacante/${vacante.id_vacante}`);
            const data = await response.json();

            if (data.success && data.data.length > 0) {
                container.innerHTML += `
                    <div class="card" style="margin-bottom: 20px;">
                        <h3>${vacante.titulo} (${data.count} postulaciones)</h3>
                        <button class="btn btn-secondary" onclick="verPostulaciones(${vacante.id_vacante}, '${vacante.titulo}')">
                            Ver todas las postulaciones
                        </button>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    if (container.innerHTML === '') {
        container.innerHTML = '<div class="empty-state"><p>No has recibido postulaciones aún</p></div>';
    }
}

function cargarEstadisticas() {
    const activas = vacantes.filter(v => v.estado === 'activa').length;
    const totalPostulaciones = vacantes.reduce((sum, v) => sum + (parseInt(v.total_postulaciones) || 0), 0);

    document.getElementById('totalVacantes').textContent = vacantes.length;
    document.getElementById('vacantesActivas').textContent = activas;
    document.getElementById('totalPostulaciones').textContent = totalPostulaciones;
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
    const modal = document.getElementById('modalPostulaciones');
    if (event.target === modal) {
        cerrarModal();
    }
}