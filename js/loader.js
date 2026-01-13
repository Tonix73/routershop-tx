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