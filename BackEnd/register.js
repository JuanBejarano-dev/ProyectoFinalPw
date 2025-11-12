document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('registerForm');

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const password = document.getElementById('password').value.trim();
        const confirm = document.getElementById('confirmPassword').value.trim();
        const terms = document.getElementById('terms').checked;
        const cvInput = document.getElementById('cv');

        if (password !== confirm) {
            alert('Las contraseñas no coinciden.');
            return;
        }

        if (!terms) {
            alert('Debes aceptar los términos y condiciones para continuar.');
            return;
        }

        if (cvInput.files.length > 0) {
            const file = cvInput.files[0];
            const maxSize = 2 * 1024 * 1024;
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

        alert('Registro exitoso (simulado). Revisa la consola para ver los datos enviados.');

        const data = {
            fullname: document.getElementById('fullname').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            location: document.getElementById('location').value.trim(),
            role: document.getElementById('role').value,
            hasCv: cvInput.files.length > 0
        };

        console.log('Datos de registro (simulado):', data);

        form.reset();
    });
});
