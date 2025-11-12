document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('registerForm');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Obtener valores del formulario
        const password = document.getElementById('password').value.trim();
        const confirm = document.getElementById('confirmPassword').value.trim();
        const terms = document.getElementById('terms').checked;
        const cvInput = document.getElementById('cv');

        // Validación: Contraseñas coinciden
        if (password !== confirm) {
            alert('Las contraseñas no coinciden.');
            return;
        }

        // Validación: Términos aceptados
        if (!terms) {
            alert('Debes aceptar los términos y condiciones para continuar.');
            return;
        }

        // Validación: CV (si existe)
        if (cvInput.files.length > 0) {
            const file = cvInput.files[0];
            const maxSize = 2 * 1024 * 1024; // 2MB
            const allowed = ['application/pdf'];

            if (!allowed.includes(file.type)) {
                alert('El CV debe ser un archivo PDF.');
                return;
            }

            if (file.size > maxSize) {
                alert('El CV debe ser menor a 2MB.');
                return;
            }
        }

        // Preparar datos para enviar
        const formData = new FormData();
        formData.append('nombre_completo', document.getElementById('fullname').value.trim());
        formData.append('email', document.getElementById('email').value.trim());
        formData.append('telefono', document.getElementById('phone').value.trim());
        formData.append('ubicacion', document.getElementById('location').value.trim());
        
        // Mapear el valor del select al formato de la BD
        const roleSelect = document.getElementById('role').value;
        const tipo_usuario = roleSelect === 'applicant' ? 'postulante' : 'empresa';
        formData.append('tipo_usuario', tipo_usuario);
        
        formData.append('contrasena', password);

        // Agregar CV si existe
        if (cvInput.files.length > 0) {
            formData.append('cv', cvInput.files[0]);
        }

        // Deshabilitar botón mientras se procesa
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registrando...';

        try {
            // Enviar datos al servidor
            const response = await fetch(`${config.apiUrl}/api/usuarios/registro`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Registro exitoso
                alert('✅ ' + data.message + '\n\n¡Bienvenido ' + data.data.nombre_completo + '!');
                
                console.log('Usuario registrado:', data.data);
                
                // Limpiar formulario
                form.reset();
                
                // Redirigir al login después de 1 segundo
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1000);
                
            } else {
                // Error del servidor
                alert('❌ Error: ' + data.message);
                console.error('Error del servidor:', data);
            }

        } catch (error) {
            // Error de red o del navegador
            console.error('Error al registrar usuario:', error);
            alert('❌ Error de conexión. Por favor verifica que el servidor esté corriendo en el puerto 3000.');
        } finally {
            // Rehabilitar botón
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });

    // Opcional: Mostrar nombre del archivo seleccionado
    const cvInput = document.getElementById('cv');
    cvInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            const fileName = this.files[0].name;
            console.log('Archivo seleccionado:', fileName);
            
            // Puedes agregar un mensaje visual si quieres
            const label = this.previousElementSibling;
            if (label && label.tagName === 'LABEL') {
                label.textContent = `Subir CV (PDF, opcional) - ${fileName}`;
            }
        }
    });
});