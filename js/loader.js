// loader.js - VERSIÓN FINAL

document.addEventListener("DOMContentLoaded", function () {
    cargarComponentes();
});

// PANTALLA DE CARGA (LOADER) AL INICIAR LA PÁGINA GENERAL

window.addEventListener('load', function() {
    const loader = document.getElementById('loader-wrapper');
    
    // Si existe el loader en esta página, lo ocultamos
    if(loader) {
        // Le damos un pequeño respiro (500ms) para que se vea la marca
        setTimeout(() => {
            loader.classList.add('loader-hidden');
        }, 500); 
    }
});

// --- 1. FUNCIÓN GLOBAL: ACTUALIZAR EL GLOBO ROJO ---
// Definimos esto primero para que esté disponible en todo momento
window.actualizarContadorGlobal = function () {
    // Leer carrito
    const carrito = JSON.parse(localStorage.getItem('carrito')) || [];

    // Sumar cantidades (Ej: 2 routers + 1 antena = 3 artículos)
    const totalItems = carrito.reduce((acumulador, item) => acumulador + item.cantidad, 0);

    // Buscar el globito en el HTML (que viene del header.html)
    const badge = document.getElementById('contador-carrito-global');

    if (badge) {
        badge.innerText = totalItems;

        // Mostrar u ocultar y animar
        if (totalItems > 0) {
            badge.style.display = 'block';
            // Pequeño efecto "pop" visual
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
    if (event) event.preventDefault(); // Evita que la página salte o se recargue

    // 1. Buscamos si existe el modal del carrito en esta página
    const modal = document.getElementById('modal-carrito');

    if (modal) {
        // SI EXISTE EL MODAL (Ej: en index.html)
        modal.style.display = 'block';

        // Si existe la función de dibujar los productos, la llamamos
        if (typeof renderizarCarrito === 'function') {
            renderizarCarrito();
        }
    } else {
        // NO EXISTE EL MODAL AQUÍ (Ej: en perfil.html o páginas viejas)
        // Redirigimos al usuario al inicio para que vea su carrito
        window.location.href = "index.html#abrir-carrito";
    }
};

// Cargar Navbar y Footer
async function cargarComponentes() {
    try {
        // --- 1. Cargar Header ---
        // (Ya incluye TopBar, Navbar y WhatsApp dentro del archivo HTML)
        const headerResp = await fetch('header.html');
        if (headerResp.ok) {
            const headerHtml = await headerResp.text();

            // SIMPLEMENTE PEGAMOS EL HTML, SIN AGREGAR NADA EXTRA DESDE JS
            document.getElementById('app-navbar').innerHTML = headerHtml;

            // Actualizar el globo del carrito apenas cargue
            if (window.actualizarContadorGlobal) window.actualizarContadorGlobal();

            // Reactivar el botón hamburguesa móvil
            // (Esta función debe existir en tu app.js o aquí mismo)
            if (typeof iniciarLogicaNavbar === 'function') iniciarLogicaNavbar();
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

// Lógica del menú hamburguesa (Por si no la tienes en otro lado)
function toggleMenu() {
    const navLinks = document.getElementById('nav-links');
    if (navLinks) {
        navLinks.classList.toggle('active');
    }
}

// Ejecutar al inicio
document.addEventListener("DOMContentLoaded", cargarComponentes);

// --- LÓGICA DE CONDICIONALES (ADMIN / USUARIO) ---
async function iniciarLogicaNavbar() {
    // NOTA: Ya no calculamos el carrito aquí, usamos la función global arriba.

    // Verificar Supabase
    if (typeof clienteSupabase !== 'undefined') {
        const { data: { session } } = await clienteSupabase.auth.getSession();
        aplicarPermisosVisuales(session);

        clienteSupabase.auth.onAuthStateChange((event, session) => {
            aplicarPermisosVisuales(session);
        });
    }
}

function aplicarPermisosVisuales(session) {
    // Referencias
    const linkInicio = document.getElementById('link-inicio');
    const linkAdmin = document.getElementById('link-admin');
    const linkPerfil = document.getElementById('link-perfil');
    const btnCarrito = document.getElementById('btn-carrito'); // Ojo: en el nuevo header es un <a> con id btn-carrito
    const btnLogin = document.getElementById('btn-login-nav');
    const userDisplay = document.getElementById('user-display');

    // Dónde estamos
    const path = window.location.pathname;
    const esAdminPage = path.includes('admin.html');
    const esCheckout = path.includes('finalizar_compra.html');

    // 1. LÓGICA GENERAL
    if (linkInicio) linkInicio.style.display = 'flex';

    // Ocultar carrito en checkout
    if (btnCarrito) {
        btnCarrito.style.display = esCheckout ? 'none' : 'flex';
    }

    // 2. LÓGICA DE USUARIO
    if (session) {
        // --- LOGUEADO ---
        if (btnLogin) btnLogin.style.display = 'none';
        if (userDisplay) userDisplay.style.display = 'flex'; // Usamos flex para mantener alineación

        // "Mis Pedidos": Mostrar siempre al usuario logueado
        if (linkPerfil) linkPerfil.style.display = 'flex';

        // "Admin": Solo ivantonix
        if (session.user.email === 'ivantonix@gmail.com') {
            if (linkAdmin) linkAdmin.style.display = esAdminPage ? 'none' : 'flex';
        } else {
            if (linkAdmin) linkAdmin.style.display = 'none';
        }

    } else {
        // --- INVITADO ---
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

// --- FUNCIÓN GLOBAL: ABRIR LOGIN ---
window.abrirLoginGlobal = function (event) {
    if (event) event.preventDefault(); // Evita saltos raros

    // 1. Buscamos si existe el modal de login en esta página
    const modal = document.getElementById('modal-login');

    if (modal) {
        // SI EXISTE (Ej: index.html o producto.html)
        modal.style.display = 'block';
    } else {
        // NO EXISTE (Ej: terminos.html) -> Vamos al inicio con la orden de abrir
        window.location.href = "index.html#abrir-login";
    }
};

// --- NUEVO: MENÚ HAMBURGUESA (MÓVIL) ---
function toggleMenu() {
    const links = document.getElementById('nav-links');
    if (!links) return;

    // En móvil usamos la clase .active definida en el CSS del header
    if (links.classList.contains('active')) {
        links.classList.remove('active');
    } else {
        links.classList.add('active');
    }
}

// --- NAVEGACIÓN PROTEGIDA (El Portero) ---
// Úsalo en enlaces que requieran estar logueado (como "Mis Pedidos")
window.navegarProtegido = async function (url, event) {
    if (event) event.preventDefault(); // Detener la carga de la página

    // Verificamos si Supabase está listo
    if (typeof clienteSupabase === 'undefined') {
        window.location.href = url; // Si falla, dejamos pasar (fallback)
        return;
    }

    // Preguntamos a Supabase si hay sesión
    const { data: { session } } = await clienteSupabase.auth.getSession();

    if (session) {
        // SI ESTÁ LOGUEADO -> Pasa adelante
        window.location.href = url;
    } else {
        // NO ESTÁ LOGUEADO -> Alto ahí

        // 1. Mostrar mensaje de error bonito (si existe la función)
        if (window.mostrarNotificacion) {
            window.mostrarNotificacion("🔒 Debes iniciar sesión para ver tus pedidos", "error");
        } else {
            alert("🔒 Debes iniciar sesión para ver tus pedidos");
        }

        // 2. Abrir el modal de Login
        if (window.abrirLoginGlobal) {
            window.abrirLoginGlobal();
        } else {
            window.location.href = "index.html#abrir-login";
        }
    }
};