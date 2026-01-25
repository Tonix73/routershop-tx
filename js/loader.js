// loader.js - VERSIÓN CORREGIDA

document.addEventListener("DOMContentLoaded", function () {
    cargarComponentes();
});

// PANTALLA DE CARGA (LOADER)
window.addEventListener('load', function () {
    const loader = document.getElementById('loader-wrapper');
    if (loader) {
        setTimeout(() => {
            loader.classList.add('loader-hidden');
        }, 500);
    }
});

// --- 1. FUNCIÓN GLOBAL: ACTUALIZAR EL GLOBO ROJO ---
window.actualizarContadorGlobal = function () {
    const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const totalItems = carrito.reduce((acumulador, item) => acumulador + item.cantidad, 0);
    const badge = document.getElementById('contador-carrito-global');

    if (badge) {
        badge.innerText = totalItems;
        if (totalItems > 0) {
            badge.style.display = 'block';
            badge.style.transform = "scale(1.3)";
            badge.style.transition = "transform 0.2s";
            setTimeout(() => badge.style.transform = "scale(1)", 200);
        } else {
            badge.style.display = 'none';
        }
    }
};

// --- FUNCIÓN GLOBAL: ABRIR CARRITO ---
window.abrirCarritoGlobal = function (event) {
    if (event) event.preventDefault();
    const modal = document.getElementById('modal-carrito');
    if (modal) {
        modal.style.display = 'block';
        if (typeof renderizarCarrito === 'function') {
            renderizarCarrito();
        }
    } else {
        window.location.href = "index.html#abrir-carrito";
    }
};

// --- MENÚ HAMBURGUESA (GLOBAL) ---
// IMPORTANTE: Usamos 'window.' para asegurar que el HTML dinámico lo encuentre
window.toggleMenu = function () {
    const links = document.getElementById('nav-links');
    if (!links) {
        console.error("No se encontró el elemento con id 'nav-links'");
        return;
    }
    // toggle hace lo mismo que tu if/else: si la tiene la quita, si no la tiene la pone
    links.classList.toggle('active');
};

// --- CARGAR NAVBAR Y FOOTER ---
async function cargarComponentes() {
    try {
        // --- 1. Cargar Header ---
        const headerResp = await fetch('header.html');
        if (headerResp.ok) {
            const headerHtml = await headerResp.text();
            document.getElementById('app-navbar').innerHTML = headerHtml;

            // === ZONA DE CORRECCIÓN ===
            // 1. Actualizar globo
            if (window.actualizarContadorGlobal) window.actualizarContadorGlobal();

            // 2. Reactivar lógica de usuario (Login/Admin)
            if (typeof iniciarLogicaNavbar === 'function') iniciarLogicaNavbar();

            // 3. ASEGURAR QUE EL BOTÓN TENGA EL EVENTO (Refuerzo)
            // Busca la clase .menu-icon o el ID que uses en tu header.html
            const btnMenu = document.querySelector('.menu-icon') || document.getElementById('menu-toggle');
            if (btnMenu) {
                // Le asignamos el clic manualmente por si el onclick del HTML falla
                btnMenu.onclick = window.toggleMenu;
            }
        }

        // --- 2. Cargar Footer ---
        const footerResp = await fetch('footer.html');
        if (footerResp.ok) {
            const footerHtml = await footerResp.text();
            document.getElementById('app-footer').innerHTML = footerHtml;
        }

    } catch (error) {
        console.error("Error cargando componentes:", error);
    }
}

// --- LÓGICA DE CONDICIONALES (ADMIN / USUARIO) ---
async function iniciarLogicaNavbar() {
    if (typeof clienteSupabase !== 'undefined') {
        const { data: { session } } = await clienteSupabase.auth.getSession();
        aplicarPermisosVisuales(session);

        // ESCUCHAMOS EL EVENTO DE LOGIN
        clienteSupabase.auth.onAuthStateChange((event, session) => {
            aplicarPermisosVisuales(session);

            // --- LÓGICA NUEVA: REDIRECCIÓN AUTOMÁTICA ---
            if (event === 'SIGNED_IN') {
                // Preguntamos: ¿Había alguna redirección pendiente?
                const destino = localStorage.getItem('redireccion_pendiente');

                if (destino) {
                    // 1. Borramos la nota para que no pase siempre
                    localStorage.removeItem('redireccion_pendiente');

                    // 2. Redirigimos al usuario a donde quería ir
                    console.log("Redirigiendo a:", destino); // Para depurar
                    window.location.href = destino;
                }
            }
        });
    }
}

function aplicarPermisosVisuales(session) {
    const linkInicio = document.getElementById('link-inicio');
    const linkAdmin = document.getElementById('link-admin');
    const linkPerfil = document.getElementById('link-perfil');
    const btnCarrito = document.getElementById('btn-carrito');
    const btnLogin = document.getElementById('btn-login-nav');
    const userDisplay = document.getElementById('user-display');

    const path = window.location.pathname;
    const esAdminPage = path.includes('admin.html');
    const esCheckout = path.includes('finalizar_compra.html');

    if (linkInicio) linkInicio.style.display = 'flex';
    if (btnCarrito) btnCarrito.style.display = esCheckout ? 'none' : 'flex';

    if (session) {
        if (btnLogin) btnLogin.style.display = 'none';
        if (userDisplay) userDisplay.style.display = 'flex';
        if (linkPerfil) linkPerfil.style.display = 'flex';

        if (session.user.email === 'ivantonix@gmail.com') {
            if (linkAdmin) linkAdmin.style.display = esAdminPage ? 'none' : 'block';
        } else {
            if (linkAdmin) linkAdmin.style.display = 'none';
        }
    } else {
        if (btnLogin) btnLogin.style.display = 'flex';
        if (userDisplay) userDisplay.style.display = 'none';
        if (linkPerfil) linkPerfil.style.display = 'none';
        if (linkAdmin) linkAdmin.style.display = 'none';
    }
}

// --- FUNCIONES GLOBALES DE NAVEGACIÓN ---
async function cerrarSesionGlobal() {
    await clienteSupabase.auth.signOut();
    window.location.href = "index.html";
}

window.abrirLoginGlobal = function (event) {
    if (event) event.preventDefault();
    const modal = document.getElementById('modal-login');
    if (modal) {
        modal.style.display = 'block';
    } else {
        window.location.href = "index.html#abrir-login";
    }
};

window.navegarProtegido = async function (url, event) {
    if (event) event.preventDefault();
    if (typeof clienteSupabase === 'undefined') {
        window.location.href = url;
        return;
    }
    const { data: { session } } = await clienteSupabase.auth.getSession();
    if (session) {
        window.location.href = url;
    } else {
        if (window.mostrarNotificacion) {
            window.mostrarNotificacion("🔒 Debes iniciar sesión para ver tus pedidos", "error");
        } else {
            alert("🔒 Debes iniciar sesión para ver tus pedidos");
        }
        if (window.abrirLoginGlobal) {
            window.abrirLoginGlobal();
        } else {
            window.location.href = "index.html#abrir-login";
        }
    }
};

// ==========================================
// 8. INYECCIÓN AUTOMÁTICA DE MODALES (GLOBAL)
// ==========================================
function inyectarModales() {
    // Protección: Si ya existen los modales en el HTML, no los duplicamos
    if (document.getElementById('modal-carrito')) return;

    const htmlModales = `
    <div id="modal-carrito" class="modal-fondo">
        <div class="modal-contenido">
            <span class="cerrar-modal" onclick="cerrarModal('modal-carrito')">×</span>
            <h2 style="margin-top:0; color:#333; display:flex; align-items:center; gap:10px; justify-content: center !important;">
                <span class="material-icons" style="color:#0056b3;">shopping_cart</span> Tu Carrito
            </h2>

            <div style="max-height: 50vh; overflow-y: auto; overflow-x: hidden;">
                <table class="tabla-carrito">
                    <tbody id="cuerpo-tabla-carrito"></tbody>
                </table>
            </div>

            <div class="total-pagar" id="total-carrito">Total: $0.00</div>
            <button id="btn-pagar-dinamico" class="btn-ir-pagar" onclick="procederAlPago()">Proceder al Pago ➝</button>
        </div>
    </div>

    <div id="modal-login" class="modal-fondo">
        <div class="modal-contenido">
            <span class="cerrar-modal" onclick="cerrarModal('modal-login')">×</span>
            <h2 id="titulo-login" style="text-align:center; margin-top:0;">Iniciar Sesión</h2>
            <div class="form-grupo">
                <label>Correo</label>
                <input type="email" id="email-input" class="input-login">
            </div>
            <div class="form-grupo">
                <label>Contraseña</label>
                <input type="password" id="password-input" class="input-login">
                <div style="text-align: right; margin-top: 5px;">
                    <a href="#" onclick="recuperarContrasena()" style="color: #666; font-size: 0.85em; text-decoration: none;">¿Olvidaste tu contraseña?</a>
                </div>
            </div>
            <button class="btn-full" onclick="manejarAuth()">Entrar</button>
            <p id="error-login" style="color: red; text-align: center; margin-top: 15px; font-size:0.9em;"></p>
            <span class="link-toggle" onclick="toggleModoLogin()">¿No tienes cuenta? Regístrate aquí</span>
        </div>
    </div>

    <div id="modal-reset-password" class="modal-fondo">
        <div class="modal-contenido" style="border-top-color: #ffc107;">
            <h2 style="text-align:center; margin-top:0;">🔒 Nueva Contraseña</h2>
            <div class="form-grupo">
                <input type="password" id="new-password-input" class="input-login" placeholder="Mínimo 6 caracteres">
            </div>
            <button class="btn-full" onclick="guardarNuevaContrasena()" style="background-color:#ffc107; color:#333;">Actualizar</button>
        </div>
    </div>
    `;

    // Insertamos todo el bloque al final del body
    document.body.insertAdjacentHTML('beforeend', htmlModales);
}

// Ejecutar automáticamente al cargar cualquier página
document.addEventListener('DOMContentLoaded', () => {
    inyectarModales();
});

// ==========================================
// 9. MODAL DE AVISO (ÉXITO / INFO)
// ==========================================
window.mostrarAviso = function (titulo, mensaje, tipo = 'success') {
    return new Promise((resolve) => {
        // 1. Inyectar HTML si no existe
        if (!document.getElementById('modal-aviso')) {
            const html = `
            <div id="modal-aviso" class="modal-fondo" style="display: none; align-items: center; justify-content: center; z-index: 3000;">
                <div class="modal-contenido" style="max-width: 400px; text-align: center; border-top: 5px solid #28a745;">
                    <span id="aviso-icono" class="material-icons" style="font-size: 48px; color: #28a745; margin-bottom: 10px;">check_circle</span>
                    <h3 id="aviso-titulo" style="margin: 0 0 10px 0; color: #333;"></h3>
                    <p id="aviso-mensaje" style="color: #666; margin-bottom: 25px; line-height: 1.5;"></p>
                    <button id="btn-aviso-ok" class="btn-full" style="background: #0056b3; margin: 0 auto; width: 50%;">Entendido</button>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', html);
        }

        // 2. Configurar contenido
        const modal = document.getElementById('modal-aviso');
        const icono = document.getElementById('aviso-icono');
        const borde = modal.querySelector('.modal-contenido');

        document.getElementById('aviso-titulo').innerText = titulo;
        document.getElementById('aviso-mensaje').innerHTML = mensaje; // innerHTML para permitir saltos de línea <br>

        // Cambiar colores si es error
        if (tipo === 'error') {
            icono.innerText = 'error';
            icono.style.color = '#dc3545';
            borde.style.borderTopColor = '#dc3545';
        } else {
            icono.innerText = 'check_circle';
            icono.style.color = '#28a745';
            borde.style.borderTopColor = '#28a745';
        }

        // 3. Mostrar
        modal.style.display = 'flex';

        // 4. Manejar cierre
        const btnOk = document.getElementById('btn-aviso-ok');
        const cerrar = () => {
            modal.style.display = 'none';
            // Clonar el botón para eliminar listeners viejos y evitar duplicados
            const nuevoBtn = btnOk.cloneNode(true);
            btnOk.parentNode.replaceChild(nuevoBtn, btnOk);
            resolve();
        };

        btnOk.addEventListener('click', cerrar);
    });
};