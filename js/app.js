// ==========================================
// 1. CONFIGURACIÓN INICIAL (SUPABASE)
// ==========================================
const SUPABASE_URL = 'https://qalbtsegnuwbnjnndvag.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhbGJ0c2VnbnV3Ym5qbm5kdmFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczODEwNjcsImV4cCI6MjA4Mjk1NzA2N30.fkezwSO8PjUT-1I8uqbsRGtxGRIGNdYY_5W1sGi09cc';
const clienteSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variables Globales
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
let modoRegistro = false; // Para alternar entre Login y Registro

// ==========================================
// 2. SISTEMA DE NOTIFICACIONES (TOAST)
// ==========================================
function mostrarNotificacion(mensaje, tipo = 'info') {
    const toast = document.getElementById('notificacion-toast');
    if(!toast) return; // Si no hay toast en el HTML, salir
    
    document.getElementById('notif-mensaje').innerText = mensaje;
    const icono = document.getElementById('notif-icono');
    
    // Cambiar color según tipo
    toast.className = 'notificacion-container ' + (tipo === 'error' ? 'notificacion-error' : (tipo === 'success' ? 'notificacion-success' : 'notificacion-info'));
    
    // Cambiar icono
    if(icono) {
        if(tipo === 'success') icono.innerText = 'check_circle';
        else if(tipo === 'error') icono.innerText = 'error_outline';
        else icono.innerText = 'info';
    }

    // Animación
    toast.style.top = '20px'; 
    setTimeout(() => { toast.style.top = '-100px'; }, 3000);
}

// ==========================================
// 3. GESTIÓN DE MODALES (ABRIR/CERRAR)
// ==========================================
function cerrarModal(id) {
    const modal = document.getElementById(id);
    if(modal) modal.style.display = 'none';
}

// Cerrar al dar click fuera (fondo oscuro)
window.onclick = function(event) {
    if (event.target.className === 'modal-fondo' || event.target.className === 'lightbox-modal') {
        event.target.style.display = 'none';
    }
}

// ==========================================
// 4. LÓGICA DEL CARRITO DE COMPRAS
// ==========================================
function agregarAlCarrito(id, nombre, precio, imagen) {
    const item = carrito.find(i => i.id === id);
    if (item) {
        item.cantidad++;
    } else {
        carrito.push({ id, nombre, precio, imagen, cantidad: 1 });
    }
    guardarCarrito();
    mostrarNotificacion("Producto agregado al carrito", "success");
}

function abrirCarrito() {
    const modal = document.getElementById('modal-carrito');
    if(modal) {
        modal.style.display = 'block';
        renderizarCarrito();
    }
}

function renderizarCarrito() {
    const cuerpo = document.getElementById('cuerpo-tabla-carrito');
    const totalElem = document.getElementById('total-carrito');
    const btnPagar = document.getElementById('btn-pagar-dinamico');

    if(!cuerpo) return; // Si no existe el elemento, salir

    cuerpo.innerHTML = '';
    let total = 0;

    if (carrito.length === 0) {
        cuerpo.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#777;">Tu carrito está vacío 🛒</td></tr>';
        if(totalElem) totalElem.innerText = 'Total: $0.00';
        if (btnPagar) btnPagar.style.display = 'none';
        return;
    }

    carrito.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        cuerpo.innerHTML += `
            <tr>
                <td><img src="${item.imagen}" onerror="this.src='https://via.placeholder.com/50'"></td>
                <td>${item.nombre}</td>
                <td style="text-align:center;">x${item.cantidad}</td>
                <td>$${subtotal.toFixed(2)}</td>
                <td><button class="btn-eliminar" onclick="eliminarDelCarrito(${item.id})"><span class="material-icons" style="font-size:18px;">close</span></button></td>
            </tr>`;
    });

    if(totalElem) totalElem.innerText = `Total: $${total.toFixed(2)}`;
    if (btnPagar) btnPagar.style.display = 'block';
}

function eliminarDelCarrito(id) {
    carrito = carrito.filter(i => i.id !== id);
    guardarCarrito();
    renderizarCarrito();
}

function guardarCarrito() {
    localStorage.setItem('carrito', JSON.stringify(carrito));
    // Actualizar el globito rojo del header si existe
    if (window.actualizarContadorGlobal) window.actualizarContadorGlobal();
}

async function procederAlPago() {
    const { data: { session } } = await clienteSupabase.auth.getSession();
    
    if (session) {
        window.location.href = "finalizar_compra.html";
    } else {
        cerrarModal('modal-carrito');
        mostrarNotificacion("🔒 Inicia sesión para comprar", "error");
        setTimeout(() => abrirLogin(), 800);
    }
}

// ==========================================
// 5. AUTENTICACIÓN (LOGIN / REGISTRO / LOGOUT)
// ==========================================
function abrirLogin() {
    const modal = document.getElementById('modal-login');
    if(modal) modal.style.display = 'block';
}

function toggleModoLogin() {
    modoRegistro = !modoRegistro;
    document.getElementById('titulo-login').innerText = modoRegistro ? "Crear Cuenta" : "Iniciar Sesión";
    document.querySelector('.link-toggle').innerText = modoRegistro ? "¿Ya tienes cuenta? Inicia Sesión" : "¿No tienes cuenta? Regístrate";
}

async function manejarAuth() {
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    const errorElem = document.getElementById('error-login');
    
    if(!email || !password) {
        errorElem.innerText = "Por favor llena ambos campos.";
        return;
    }
    
    errorElem.innerText = "Procesando...";
    let result;

    if (modoRegistro) {
        result = await clienteSupabase.auth.signUp({ email, password });
    } else {
        result = await clienteSupabase.auth.signInWithPassword({ email, password });
    }

    if (result.error) {
        errorElem.innerText = result.error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos" : result.error.message;
    } else {
        cerrarModal('modal-login');
        mostrarNotificacion(modoRegistro ? "¡Cuenta creada! Bienvenido" : "¡Bienvenido de vuelta!", "success");
        setTimeout(() => window.location.reload(), 1000);
    }
}

async function cerrarSesion() {
    await clienteSupabase.auth.signOut();
    window.location.href = "index.html";
}

async function recuperarContrasena() {
    const email = document.getElementById('email-input').value;
    if (!email) {
        mostrarNotificacion("Escribe tu correo en el campo primero", "error");
        return;
    }
    const { error } = await clienteSupabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.href });
    
    if (error) mostrarNotificacion("Error: " + error.message, "error");
    else {
        mostrarNotificacion("Correo de recuperación enviado", "success");
        cerrarModal('modal-login');
    }
}

async function guardarNuevaContrasena() {
    const nuevaPass = document.getElementById('new-password-input').value;
    if (nuevaPass.length < 6) return mostrarNotificacion("La contraseña debe tener al menos 6 caracteres", "error");
    
    const { error } = await clienteSupabase.auth.updateUser({ password: nuevaPass });
    
    if (error) mostrarNotificacion("Error: " + error.message, "error");
    else {
        mostrarNotificacion("Contraseña actualizada correctamente", "success");
        document.getElementById('modal-reset-password').style.display = 'none';
        setTimeout(() => window.location.href = "index.html", 1500);
    }
}

// ==========================================
// 6. UTILIDADES VARIAS
// ==========================================
function copiarAlPortapapeles(texto) {
    navigator.clipboard.writeText(texto).then(() => {
        mostrarNotificacion("¡Copiado al portapapeles!", "success");
    }).catch(err => {
        mostrarNotificacion("Error al copiar", "error");
    });
}

function obtenerLinkRastreo(paqueteria, guia) {
    if (!paqueteria) return '#';
    const pack = paqueteria.toLowerCase();
    
    if (pack.includes('dhl')) return `https://www.dhl.com/mx-es/home/tracking/tracking-express.html?submit=1&tracking-id=${guia}`;
    else if (pack.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${guia}`;
    else if (pack.includes('estafeta')) return `https://www.estafeta.com/Herramientas/Rastreo?guia=${guia}`;
    else return `https://www.google.com/search?q=rastreo+${paqueteria}+${guia}`;
}