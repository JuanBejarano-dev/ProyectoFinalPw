document.addEventListener('DOMContentLoaded', function () {
    const form = document.querySelector('.formulario');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Obtener valores del formulario
        const email = document.getElementById('user').value.trim();
        const contrasena = document.getElementById('password').value.trim();

        // Validación básica
        if (!email || !contrasena) {
            alert('Por favor completa todos los campos.');
            return;
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Por favor ingresa un correo electrónico válido.');
            return;
        }

        // Deshabilitar botón mientras se procesa
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Iniciando sesión...';

        try {
            // Enviar credenciales al servidor
            const response = await fetch(`${config.apiUrl}/api/usuarios/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    contrasena: contrasena
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Login exitoso
                alert('✅ ' + data.message + '\n\n¡Bienvenido de nuevo, ' + data.data.nombre_completo + '!');
                
                console.log('Usuario autenticado:', data.data);
                
                // Guardar datos del usuario en localStorage (opcional)
                localStorage.setItem('usuario', JSON.stringify(data.data));
                localStorage.setItem('isLoggedIn', 'true');
                
                // Redirigir según tipo de usuario
                if (data.data.tipo_usuario === 'empresa') {
                    // Redirigir a dashboard de empresa
                    window.location.href = 'empresaDs.html';
                } else {
                    // Redirigir a dashboard de postulante
                    window.location.href = 'postulanteDs.html';
                }
                
            } else {
                // Credenciales inválidas
                alert('❌ ' + data.message + '\n\nVerifica tu correo y contraseña.');
                console.error('Error de autenticación:', data);
                
                // Limpiar solo el campo de contraseña
                document.getElementById('password').value = '';
                document.getElementById('password').focus();
            }

        } catch (error) {
            // Error de red o del navegador
            console.error('Error al iniciar sesión:', error);
            alert('❌ Error de conexión. Por favor verifica que el servidor esté corriendo en el puerto 3000.');
        } finally {
            // Rehabilitar botón
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });

    // Verificar si ya hay sesión activa
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn === 'true') {
        const usuario = JSON.parse(localStorage.getItem('usuario'));
        
        // Mostrar mensaje y redirigir
        if (confirm('Ya tienes una sesión activa como ' + usuario.nombre_completo + '. ¿Deseas continuar?')) {
            if (usuario.tipo_usuario === 'empresa') {
                window.location.href = 'empresaDs.html';
            } else {
                window.location.href = 'postulanteDs.html';
            }
        }
    }
});