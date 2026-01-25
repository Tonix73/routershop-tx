// ==========================================
// 1. CONFIGURACIÓN INICIAL (SUPABASE)
// ==========================================
const SUPABASE_URL = 'https://qalbtsegnuwbnjnndvag.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhbGJ0c2VnbnV3Ym5qbm5kdmFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczODEwNjcsImV4cCI6MjA4Mjk1NzA2N30.fkezwSO8PjUT-1I8uqbsRGtxGRIGNdYY_5W1sGi09cc';
const clienteSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 1.5 DETECTOR DE EVENTOS (LOGIN / RECUPERACIÓN)
// ==========================================
clienteSupabase.auth.onAuthStateChange(async (event, session) => {
    // Si el usuario llega desde el link "Recuperar Contraseña"
    if (event === "PASSWORD_RECOVERY") {
        const modal = document.getElementById('modal-reset-password');
        if (modal) {
            modal.style.display = 'flex'; // Abre el modal amarillo automáticamente
            mostrarNotificacion("Ingresa tu nueva contraseña", "info");
        }
    }
});

if (typeof emailjs !== 'undefined') {
    emailjs.init("S6x887RD35YnO33Eg");
}

// Variables Globales
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
let modoRegistro = false; // Para alternar entre Login y Registro

// ==========================================
// 2. SISTEMA DE NOTIFICACIONES (TOAST)
// ==========================================
function mostrarNotificacion(mensaje, tipo = 'info') {
    const toast = document.getElementById('notificacion-toast');
    if (!toast) return; // Si no hay toast en el HTML, salir

    document.getElementById('notif-mensaje').innerText = mensaje;
    const icono = document.getElementById('notif-icono');

    // Cambiar color según tipo
    toast.className = 'notificacion-container ' + (tipo === 'error' ? 'notificacion-error' : (tipo === 'success' ? 'notificacion-success' : 'notificacion-info'));

    // Cambiar icono
    if (icono) {
        if (tipo === 'success') icono.innerText = 'check_circle';
        else if (tipo === 'error') icono.innerText = 'error_outline';
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
    if (modal) modal.style.display = 'none';
}

// Cerrar al dar click fuera (fondo oscuro)
window.onclick = function (event) {
    if (event.target.className === 'modal-fondo' || event.target.className === 'lightbox-modal') {
        event.target.style.display = 'none';
    }
}

// ==========================================
// 4. LÓGICA DEL CARRITO DE COMPRAS
// ==========================================
// ==========================================
// 4. LÓGICA DEL CARRITO (CON VALIDACIÓN DE STOCK)
// ==========================================

async function agregarAlCarrito(id, nombre, precio, imagen) {
    // 1. Consultamos el stock real en Supabase antes de agregar
    const { data: producto, error } = await clienteSupabase
        .from('productos')
        .select('stock_actual')
        .eq('id', id)
        .single();

    if (error) {
        console.error(error);
        mostrarNotificacion("Error al verificar disponibilidad", "error");
        return;
    }

    const stockMaximo = producto.stock_actual;
    const itemEnCarrito = carrito.find(i => i.id === id);
    const cantidadActual = itemEnCarrito ? itemEnCarrito.cantidad : 0;

    // 2. Validación: ¿Hay espacio para uno más?
    if (cantidadActual + 1 > stockMaximo) {
        mostrarNotificacion(`¡Lo sentimos! Solo quedan ${stockMaximo} unidades.`, "error");
        return; // Detenemos la función aquí
    }

    // 3. Si pasó la validación, agregamos
    if (itemEnCarrito) {
        itemEnCarrito.cantidad++;
    } else {
        carrito.push({ id, nombre, precio, imagen, cantidad: 1 });
    }

    guardarCarrito();
    mostrarNotificacion("Producto agregado al carrito", "success");

    // Si el carrito está abierto, actualizamos la vista
    const modal = document.getElementById('modal-carrito');
    if (modal && modal.style.display === 'block') {
        renderizarCarrito();
    }
}

function abrirCarrito() {
    const modal = document.getElementById('modal-carrito');
    if (modal) {
        modal.style.display = 'block';
        renderizarCarrito();
    }
}

// --- FUNCIÓN MODIFICADA: Renderizado con botones +/- ---
function renderizarCarrito() {
    const cuerpoTabla = document.getElementById('cuerpo-tabla-carrito');
    const totalElemento = document.getElementById('total-carrito');
    const btnPagar = document.getElementById('btn-pagar-dinamico');

    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];

    cuerpoTabla.innerHTML = '';
    let totalGlobal = 0;

    // --- 1. CARRITO VACÍO (SOLUCIÓN RESPONSIVE) ---
    if (carrito.length === 0) {
        // TRUCO: Usamos display: flex en el TR para romper la estructura de tabla rígida
        // y que ocupe el 100% del ancho centrado.
        cuerpoTabla.innerHTML = `
            <tr style="display: flex; justify-content: center; width: 100%; border: none;">
                <td style="display: block; width: 100%; text-align: center; padding: 50px 20px; color: #777; border: none;">
                    
                    <span class="material-icons" style="font-size: 60px; color: #e0e0e0; display: block; margin: 0 auto 15px auto;">
                        remove_shopping_cart
                    </span>
                    
                    <p style="margin: 0; font-size: 1.2em; font-weight: 500;">Tu carrito está vacío.</p>
                    
                    <a href="catalogo.html" onclick="cerrarModal('modal-carrito')" 
                       style="display: inline-block; margin-top: 15px; color: #0056b3; text-decoration: none; font-weight: bold; border: 1px solid #0056b3; padding: 8px 15px; border-radius: 20px;">
                        Ir al Catálogo
                    </a>

                </td>
            </tr>`;

        if (totalElemento) totalElemento.style.display = 'none';
        if (btnPagar) btnPagar.style.display = 'none';

        if (window.actualizarContadorGlobal) window.actualizarContadorGlobal();
        return;
    }

    // --- 2. SI HAY PRODUCTOS ---
    if (totalElemento) totalElemento.style.display = 'block';
    if (btnPagar) btnPagar.style.display = 'block';

    carrito.forEach((prod) => {
        const subtotal = prod.precio * prod.cantidad;
        totalGlobal += subtotal;

        cuerpoTabla.innerHTML += `
            <tr class="fila-carrito">
                <td class="col-img">
                    <img src="${prod.imagen}" alt="${prod.nombre}">
                </td>
                <td class="col-nombre">
                    <div class="nombre-producto">${prod.nombre}</div>
                </td>
                <td class="col-cantidad">
                    <div class="qty-control">
                        <button onclick="cambiarCantidad(${prod.id}, -1)">-</button>
                        <span>${prod.cantidad}</span>
                        <button onclick="cambiarCantidad(${prod.id}, 1)">+</button>
                    </div>
                </td>
                <td class="col-precio">
                    $${subtotal.toFixed(2)}
                </td>
                <td class="col-borrar">
                    <button onclick="eliminarDelCarrito(${prod.id})" class="btn-trash">
                        <span class="material-icons">close</span>
                    </button>
                </td>
            </tr>
        `;
    });

    if (totalElemento) totalElemento.innerText = `Total: $${totalGlobal.toFixed(2)}`;
    if (window.actualizarContadorGlobal) window.actualizarContadorGlobal();
}

async function cambiarCantidad(id, cambio) {
    const item = carrito.find(i => i.id === id);
    if (!item) return;

    // CASO 1: Si queremos RESTAR (-), no necesitamos checar stock en BD
    if (cambio === -1) {
        if (item.cantidad > 1) {
            item.cantidad--;
            guardarCarrito();
            renderizarCarrito();
        }
        return;
    }

    // CASO 2: Si queremos SUMAR (+), verificamos stock primero
    if (cambio === 1) {
        const { data, error } = await clienteSupabase
            .from('productos')
            .select('stock_actual')
            .eq('id', id)
            .single();

        if (error) return mostrarNotificacion("Error de conexión", "error");

        const stockMaximo = data.stock_actual;

        if (item.cantidad + 1 > stockMaximo) {
            mostrarNotificacion(`Stock insuficiente. Máximo: ${stockMaximo}`, "error");
            return;
        }

        // Si hay stock, procedemos
        item.cantidad++;
        guardarCarrito();
        renderizarCarrito();
    }
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
        // 1. Si ya está logueado, pasa directo
        window.location.href = "finalizar_compra.html";
    } else {
        // 2. Si NO está logueado:

        // A) Guardamos la "nota mental" de a dónde quería ir
        localStorage.setItem('redireccion_pendiente', 'finalizar_compra.html');

        // B) Cerramos carrito y mostramos login
        cerrarModal('modal-carrito');
        mostrarNotificacion("🔒 Inicia sesión para finalizar tu compra", "info");

        // Usamos la función global si existe, o la local
        setTimeout(() => {
            if (window.abrirLoginGlobal) {
                window.abrirLoginGlobal();
            } else {
                abrirLogin();
            }
        }, 500);
    }
}

// ==========================================
// 5. AUTENTICACIÓN (LOGIN / REGISTRO / LOGOUT)
// ==========================================
function abrirLogin() {
    const modal = document.getElementById('modal-login');
    if (modal) modal.style.display = 'block';
}

function toggleModoLogin() {
    modoRegistro = !modoRegistro;
    document.getElementById('titulo-login').innerText = modoRegistro ? "Crear Cuenta" : "Iniciar Sesión";
    document.querySelector('.link-toggle').innerText = modoRegistro ? "¿Ya tienes cuenta? Inicia Sesión" : "¿No tienes cuenta? Regístrate";
}

async function manejarAuth() {
    const email = document.getElementById('email-input').value.trim();
    const password = document.getElementById('password-input').value.trim();
    const errorElem = document.getElementById('error-login');

    if (!email || !password) {
        errorElem.innerText = "Por favor llena ambos campos.";
        return;
    }

    errorElem.innerText = "Procesando...";

    // --- MODO REGISTRO ---
    if (modoRegistro) {
        // 1. Crear usuario en Supabase
        const { data, error } = await clienteSupabase.auth.signUp({
            email: email,
            password: password,
            options: {
                emailRedirectTo: window.location.origin + window.location.pathname
            }
        });

        if (error) {
            errorElem.innerText = error.message;
            return;
        }

        // 2. Éxito en Supabase -> Enviamos correo EmailJS
        cerrarModal('modal-login');

        // Preparamos los datos
        const paramsEmail = {
            to_email: email,
            to_name: email.split('@')[0],
            message: "Gracias por unirte a RouterShop TX. Tu cuenta ha sido creada."
        };

        try {
            // AWAIT IMPORTANTE: Esperamos a que se envíe el correo
            await emailjs.send('service_i1yzl9c', 'template_z9pflqg', paramsEmail);
            console.log("✅ EmailJS enviado correctamente");
        } catch (err) {
            console.error("❌ Falló EmailJS pero el usuario se creó:", err);
            // No detenemos el flujo, el usuario ya se creó
        }

        // 3. Mostrar el NUEVO MODAL (Aquí ya no hay alerta fea)
        await mostrarAviso(
            "¡Registro Exitoso!",
            `Hemos enviado un enlace de confirmación a <b>${email}</b>.<br><br>1. Revisa tu correo (y spam).<br>2. Confirma tu cuenta.<br>3. ¡Recibirás tu bienvenida!`
        );

    }
    // --- MODO LOGIN ---
    else {
        const { data, error } = await clienteSupabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            if (error.message.includes("Email not confirmed")) {
                errorElem.innerHTML = "⚠️ Tu correo no ha sido confirmado.<br>Revisa tu bandeja de entrada.";
            } else {
                errorElem.innerText = "Credenciales incorrectas.";
            }
        } else {
            cerrarModal('modal-login');
            mostrarNotificacion("¡Bienvenido de vuelta!", "success");
            setTimeout(() => window.location.reload(), 1000);
        }
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
    // 1. Obtenemos el valor y quitamos espacios
    const inputPass = document.getElementById('new-password-input');
    const nuevaPass = inputPass.value.trim();

    // 2. Validaciones
    if (nuevaPass.length < 6) {
        return mostrarNotificacion("La contraseña debe tener al menos 6 caracteres", "error");
    }

    // 3. Feedback visual (Cambiar texto del botón)
    const btn = document.querySelector('#modal-reset-password button');
    const textoOriginal = btn.innerText;
    btn.innerText = "Guardando...";
    btn.disabled = true;

    // 4. Enviar a Supabase
    const { error } = await clienteSupabase.auth.updateUser({ password: nuevaPass });

    if (error) {
        mostrarNotificacion("Error: " + error.message, "error");
        btn.innerText = textoOriginal;
        btn.disabled = false;
    } else {
        mostrarNotificacion("¡Contraseña actualizada con éxito!", "success");

        // 5. Limpieza y redirección
        document.getElementById('modal-reset-password').style.display = 'none';
        inputPass.value = ""; // Limpiar el campo
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


// ==========================================
// 7. LÓGICA DEL BUSCADOR GLOBAL (MODAL)
// ==========================================

function toggleBuscador(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('modal-busqueda');
    const input = document.getElementById('input-busqueda-global');

    if (modal.style.display === 'block') {
        modal.style.display = 'none';
        input.value = ''; // Limpiar al cerrar
        document.getElementById('resultados-busqueda-container').style.display = 'none';
    } else {
        modal.style.display = 'block';
        input.focus(); // Poner el cursor automáticamente para escribir
    }
}

// Cerrar si das click en el fondo oscuro
window.addEventListener('click', function (e) {
    const modal = document.getElementById('modal-busqueda');
    if (e.target === modal) {
        toggleBuscador();
    }
});

let timeoutBusqueda = null;

async function buscarEnTiempoReal(texto) {
    const contenedor = document.getElementById('resultados-busqueda-container');

    // Si borró todo, ocultamos la lista
    if (texto.length === 0) {
        contenedor.style.display = 'none';
        return;
    }

    // Pequeño retraso para no saturar la base de datos mientras escribes rápido
    clearTimeout(timeoutBusqueda);
    timeoutBusqueda = setTimeout(async () => {

        contenedor.style.display = 'block';
        contenedor.innerHTML = '<div style="padding:15px; color:#666;">Buscando...</div>';

        // Consulta a Supabase
        const { data, error } = await clienteSupabase
            .from('productos')
            .select('id, nombre, precio, imagen_url')
            .ilike('nombre', `%${texto}%`)
            .limit(5); // Máximo 5 resultados

        contenedor.innerHTML = ''; // Limpiar "Buscando..."

        if (error || !data || data.length === 0) {
            contenedor.innerHTML = '<div style="padding:15px; color:#666;">No se encontraron productos :(</div>';
            return;
        }

        // Pintar resultados
        data.forEach(prod => {
            const img = prod.imagen_url || 'https://via.placeholder.com/50';

            // Al dar click, vamos a producto.html?id=...
            contenedor.innerHTML += `
                <a href="producto.html?id=${prod.id}" class="item-resultado">
                    <img src="${img}" alt="${prod.nombre}">
                    <div class="item-info-res">
                        <h4>${prod.nombre}</h4>
                        <span>$${prod.precio.toFixed(2)}</span>
                    </div>
                </a>
            `;
        });

    }, 300); // Espera 300ms después de que dejes de escribir
}



