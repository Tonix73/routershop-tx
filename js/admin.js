// ==========================================
// 1. VARIABLES GLOBALES & CACHÉ
// ==========================================
let ventasCache = [];
let productosCache = [];

// ==========================================
// 2. INICIALIZACIÓN Y SEGURIDAD
// ==========================================
window.addEventListener('load', async function () {
    // A. Ocultar Loader
    const loader = document.getElementById('loader-wrapper');
    if (loader) loader.style.display = 'none';

    // B. Verificar que Supabase exista
    if (typeof clienteSupabase === 'undefined') return;

    // C. Verificar Sesión
    const { data: { session } } = await clienteSupabase.auth.getSession();

    // ⚠️ SEGURIDAD: Verifica que sea TU correo
    if (!session || session.user.email !== 'ivantonix@gmail.com') {
        window.location.href = "index.html";
        return;
    }

    // D. Cargar vista inicial (Pedidos)
    cargarVentas();
});

window.cerrarSesionAdmin = async function () {
    await clienteSupabase.auth.signOut();
    window.location.href = "index.html";
};

// ==========================================
// 3. NAVEGACIÓN (SISTEMA DE PESTAÑAS)
// ==========================================
window.nav = function (vistaId, btnElement) {
    // 1. Ocultar todos los paneles
    document.querySelectorAll('.card-panel').forEach(panel => panel.classList.remove('active-view'));

    // 2. Mostrar el panel deseado
    const panel = document.getElementById(vistaId);
    if (panel) panel.classList.add('active-view');

    // 3. Actualizar estilo del menú lateral
    if (btnElement) {
        document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
        btnElement.classList.add('active');
    }

    // 4. Cargar datos según la vista (Lazy Loading)
    switch (vistaId) {
        case 'vista-ventas': cargarVentas(); break;
        case 'vista-mis-productos': cargarProductosLista(); break;
        case 'vista-inventario': cargarRentabilidad(); break;
        case 'vista-categorias': cargarCats(); break;
        case 'vista-cupones': cargarCups(); break;
        case 'vista-agregar': cargarCatsSelect(); break;
    }
};

// ==========================================
// 4. MÓDULO: GESTIÓN DE PEDIDOS (VENTAS)
// ==========================================
window.cargarVentas = async function () {
    const tbody = document.getElementById('tabla-ventas');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Cargando pedidos...</td></tr>';

    const { data } = await clienteSupabase.from('ventas').select('*').order('id', { ascending: false });
    tbody.innerHTML = '';
    ventasCache = data || [];

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay pedidos recientes.</td></tr>';
        return;
    }

    data.forEach(v => {
        // 1. Determinar Estado
        const esPagado = v.estado === 'pagado';
        const esCancelado = v.estado === 'cancelado';

        // 2. Determinar Color del Select
        let colorBg = '#fff3cd'; // Pendiente (Amarillo)
        if (esPagado) colorBg = '#d4edda'; // Pagado (Verde)
        if (esCancelado) colorBg = '#f8d7da'; // Cancelado (Rojo claro)

        // 3. Lógica de Bloqueo (Si está cancelado, todo disable)
        const disabledAttr = esCancelado ? 'disabled' : '';
        const claseFila = esCancelado ? 'tr-cancelado' : '';

        // 4. Construcción del Select
        const selectHTML = `
            <select onchange="cambiarEstadoPedido(this, ${v.id})" 
                    ${disabledAttr}
                    style="background:${colorBg}; padding:5px; border-radius:4px; border:1px solid #ccc; font-family:inherit; font-weight:500;">
                <option value="pendiente_pago" ${!esPagado && !esCancelado ? 'selected' : ''}>⏳ Pendiente</option>
                <option value="pagado" ${esPagado ? 'selected' : ''}>✅ Pagado</option>
                <option value="cancelado" ${esCancelado ? 'selected' : ''}>🚫 Cancelado</option>
            </select>`;

        // 5. Renderizado de Fila
        tbody.innerHTML += `
            <tr class="${claseFila}">
                <td><strong>#${v.id}</strong></td>
                <td>${new Date(v.fecha_compra).toLocaleDateString()}</td>
                <td style="color:#0056b3; font-weight:bold;">$${v.total.toFixed(2)}</td>
                <td>${selectHTML}</td>
                <td>
                    <div style="display:flex; gap:5px;">
                        <input id="paq-${v.id}" value="${v.paqueteria || ''}" class="input-std" style="width:70px;" placeholder="Paq." ${disabledAttr}>
                        <input id="guia-${v.id}" value="${v.numero_guia_envio !== 'PENDIENTE' ? v.numero_guia_envio : ''}" class="input-std" style="width:90px;" placeholder="Guía" ${disabledAttr}>
                    </div>
                </td>
                <td>
                    <div style="display:flex; gap:5px;">
                        <button onclick="verPedido(${v.id})" class="btn-txt-icon btn-info" title="Ver Detalles">
                            <span class="material-icons" style="font-size:16px">visibility</span>
                        </button>
                        <button onclick="guardarGuia(${v.id})" class="btn-txt-icon btn-primary" title="Guardar Guía" ${disabledAttr}>
                            <span class="material-icons" style="font-size:16px">save</span>
                        </button>
                    </div>
                </td>
            </tr>`;
    });
};

window.verPedido = function (id) {
    const venta = ventasCache.find(x => x.id === id);
    if (!venta) return;

    document.getElementById('d-id').innerText = id;
    document.getElementById('d-contacto').innerText = venta.detalles_contacto;
    document.getElementById('d-direccion').innerText = venta.direccion_envio;
    document.getElementById('d-total').innerText = `$${venta.total.toFixed(2)}`;

    const lista = document.getElementById('d-productos');
    lista.innerHTML = '';
    if (venta.productos_json) {
        venta.productos_json.forEach(p => {
            lista.innerHTML += `<li style="margin-bottom:5px;"><strong>${p.cantidad}x</strong> ${p.nombre}</li>`;
        });
    }
    document.getElementById('modal-detalles').style.display = 'flex';
};

window.cambiarEstadoPedido = async function (selectElement, id) {
    const nuevoEstado = selectElement.value;

    // Si elige cancelar, usamos NUESTRO MODAL
    if (nuevoEstado === 'cancelado') {
        // "await" espera a que el usuario haga clic en el modal antes de seguir
        const acepto = await mostrarConfirmacion(
            "¿Realmente deseas cancelar este pedido? Esta acción no se puede deshacer.",
            "⚠️ Cancelar Pedido"
        );

        if (!acepto) {
            // Si dijo "Cancelar" o cerró, recargamos para deshacer la selección visual
            cargarVentas();
            return;
        }
    }

    // Si llegó aquí, es que dijo SÍ o es otro estado
    await clienteSupabase.from('ventas').update({ estado: nuevoEstado }).eq('id', id);

    mostrarNotificacion("Estado actualizado", "success");
    cargarVentas(); // Recargar para aplicar estilos
};

window.guardarGuia = async function (id) {
    await clienteSupabase.from('ventas').update({
        numero_guia_envio: document.getElementById(`guia-${id}`).value,
        paqueteria: document.getElementById(`paq-${id}`).value
    }).eq('id', id);
    mostrarNotificacion("Datos de envío guardados", "success");
};

// ==========================================
// 5. MÓDULO: PRODUCTOS (CRUD)
// ==========================================
window.cargarProductosLista = async function () {
    const tbody = document.getElementById('tabla-lista-productos');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Cargando...</td></tr>';

    const { data } = await clienteSupabase.from('productos').select('*, categorias(nombre)').order('id', { ascending: false });
    tbody.innerHTML = '';
    productosCache = data || [];

    productosCache.forEach(p => {
        const imgUrl = p.imagen_url || 'https://via.placeholder.com/50';
        const catNombre = p.categorias ? p.categorias.nombre : '-';

        tbody.innerHTML += `
            <tr>
                <td><img src="${imgUrl}" style="width:45px; height:45px; object-fit:contain; border:1px solid #eee; border-radius:4px; padding:2px;"></td>
                <td><strong>${p.nombre}</strong><br><small style="color:#888;">SKU: ${p.sku || '-'}</small></td>
                <td>${catNombre}</td>
                <td>$${p.precio.toFixed(2)}</td>
                <td>
                    <div style="display:flex; gap:5px;">
                        <button onclick="editarProd(${p.id})" class="btn-txt-icon btn-primary"><span class="material-icons" style="font-size:16px">edit</span> Editar</button>
                        <button onclick="borrarProd(${p.id})" class="btn-txt-icon btn-danger"><span class="material-icons" style="font-size:16px">delete</span> Borrar</button>
                    </div>
                </td>
            </tr>`;
    });
};

window.borrarProd = async function (id) {
    if (confirm("¿Estás seguro de ELIMINAR este producto?")) {
        const { error } = await clienteSupabase.from('productos').delete().eq('id', id);
        if (error) return alert("Error: " + error.message);

        mostrarNotificacion("Producto eliminado", "success");
        cargarProductosLista();
    }
};

// ==========================================
// 6. MÓDULO: RENTABILIDAD
// ==========================================
window.cargarRentabilidad = async function () {
    const tbody = document.getElementById('tabla-rentabilidad');
    tbody.innerHTML = '';
    const { data } = await clienteSupabase.from('productos').select('*').order('nombre');

    if (!data) return;

    data.forEach(p => {
        const imgUrl = p.imagen_url || 'https://via.placeholder.com/40';
        const precioFinal = p.precio * (1 - (p.descuento || 0) / 100);
        const gananciaU = precioFinal - (p.precio_compra || 0);
        const gananciaTotal = gananciaU * (p.stock_actual || 0);

        tbody.innerHTML += `
            <tr>
                <td><img src="${imgUrl}" class="img-tabla"></td>
                <td><small>${p.nombre.substring(0, 20)}...</small></td>
                <td><input type="number" id="c-${p.id}" value="${p.precio_compra || 0}" class="input-std" style="width:70px; padding:6px;" onchange="recalcularFila(${p.id}, ${p.precio})"></td>
                <td>$${p.precio.toFixed(2)}</td>
                <td><input type="number" id="d-${p.id}" value="${p.descuento || 0}" class="input-std" style="width:50px; padding:6px;" onchange="recalcularFila(${p.id}, ${p.precio})">%</td>
                <td id="pf-${p.id}" style="font-weight:bold; color:#0056b3;">$${precioFinal.toFixed(2)}</td>
                <td><input type="number" id="s-${p.id}" value="${p.stock_actual || 0}" class="input-std" style="width:60px; padding:6px;" onchange="recalcularFila(${p.id}, ${p.precio})"></td>
                <td id="gu-${p.id}" style="color:${gananciaU >= 0 ? 'green' : 'red'}">$${gananciaU.toFixed(2)}</td>
                <td id="gt-${p.id}" style="font-weight:bold;">$${gananciaTotal.toFixed(2)}</td>
                <td><button onclick="guardarInventario(${p.id})" class="btn-txt-icon btn-success"><span class="material-icons" style="font-size:16px">save</span></button></td>
            </tr>`;
    });
};

window.recalcularFila = function (id, precioBase) {
    const costo = parseFloat(document.getElementById(`c-${id}`).value) || 0;
    const descuento = parseFloat(document.getElementById(`d-${id}`).value) || 0;
    const stock = parseInt(document.getElementById(`s-${id}`).value) || 0;

    const precioFinal = precioBase * (1 - descuento / 100);
    const gananciaU = precioFinal - costo;
    const gananciaTotal = gananciaU * stock;

    document.getElementById(`pf-${id}`).innerText = `$${precioFinal.toFixed(2)}`;

    const celdaGU = document.getElementById(`gu-${id}`);
    celdaGU.innerText = `$${gananciaU.toFixed(2)}`;
    celdaGU.style.color = gananciaU >= 0 ? 'green' : 'red';

    document.getElementById(`gt-${id}`).innerText = `$${gananciaTotal.toFixed(2)}`;
};

window.guardarInventario = async function (id) {
    await clienteSupabase.from('productos').update({
        precio_compra: document.getElementById(`c-${id}`).value,
        descuento: document.getElementById(`d-${id}`).value,
        stock_actual: document.getElementById(`s-${id}`).value
    }).eq('id', id);
    mostrarNotificacion("Inventario guardado", "success");
};

// ==========================================
// 7. MÓDULO: FORMULARIO (Agregar/Editar)
// ==========================================
window.limpiarFormulario = function () {
    document.getElementById('titulo-form').innerText = "➕ Nuevo Producto";
    document.getElementById('btn-submit').innerText = "GUARDAR";
    document.getElementById('btn-cancel').style.display = 'none';
    document.getElementById('p-id-edicion').value = '';

    document.querySelectorAll('#vista-agregar input, #vista-agregar textarea').forEach(i => i.value = '');
    document.getElementById('p-stock').value = 1;
    document.getElementById('p-descuento').value = 0;
    document.getElementById('p-activo').checked = true;

    document.getElementById('img-preview').src = 'https://via.placeholder.com/300?text=Subir+Foto';
    document.getElementById('contenedor-specs').innerHTML = '';

    cargarCatsSelect(); // Recargar categorías al limpiar
    agregarSpec();
};

window.editarProd = function (id) {
    const p = productosCache.find(x => x.id === id);
    if (!p) return;

    nav('vista-agregar');
    document.getElementById('titulo-form').innerText = "✏️ Editar Producto";
    document.getElementById('btn-submit').innerText = "ACTUALIZAR";
    document.getElementById('btn-cancel').style.display = 'block';
    document.getElementById('p-id-edicion').value = p.id;

    // Llenar campos
    document.getElementById('p-nombre').value = p.nombre;
    document.getElementById('p-sku').value = p.sku || '';
    document.getElementById('p-marca').value = p.marca || '';
    document.getElementById('p-modelo').value = p.modelo || '';
    document.getElementById('p-precio').value = p.precio;
    document.getElementById('p-compra').value = p.precio_compra || '';
    document.getElementById('p-descuento').value = p.descuento || 0;
    document.getElementById('p-stock').value = p.stock_actual || 0;
    document.getElementById('p-desc').value = p.descripcion || '';
    document.getElementById('img-preview').src = p.imagen_url || 'https://via.placeholder.com/300?text=Sin+Foto';
    document.getElementById('p-activo').checked = p.activo;

    // Cargar select y seleccionar la categoría correcta
    cargarCatsSelect().then(() => {
        if (p.categoria_id) document.getElementById('p-cat').value = p.categoria_id;
    });

    // Llenar specs
    const cont = document.getElementById('contenedor-specs'); cont.innerHTML = '';
    if (p.especificaciones) {
        Object.entries(p.especificaciones).forEach(([k, v]) => {
            cont.innerHTML += `<div class="spec-row" style="display:flex; gap:5px; margin-bottom:5px;"><input class="input-std sk" value="${k}"><input class="input-std sv" value="${v}"><button onclick="this.parentElement.remove()" class="btn-txt-icon btn-danger">x</button></div>`;
        });
    }
};

window.procesarProducto = async function () {
    const btn = document.getElementById('btn-submit');
    const idEdicion = document.getElementById('p-id-edicion').value;

    btn.disabled = true;
    btn.innerText = "Procesando...";

    // Recolectar Specs
    let specs = {};
    document.querySelectorAll('.spec-row').forEach(row => {
        const k = row.querySelector('.sk').value;
        const v = row.querySelector('.sv').value;
        if (k) specs[k] = v;
    });

    const datos = {
        nombre: document.getElementById('p-nombre').value,
        sku: document.getElementById('p-sku').value,
        categoria_id: document.getElementById('p-cat').value,
        marca: document.getElementById('p-marca').value,
        modelo: document.getElementById('p-modelo').value,
        precio: document.getElementById('p-precio').value,
        precio_compra: document.getElementById('p-compra').value || 0,
        descuento: document.getElementById('p-descuento').value || 0,
        stock_actual: document.getElementById('p-stock').value || 0,
        descripcion: document.getElementById('p-desc').value,
        especificaciones: specs,
        activo: document.getElementById('p-activo').checked
    };

    // Subir imagen si hay nueva
    const fileInput = document.getElementById('p-img-file');
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
        const { error } = await clienteSupabase.storage.from('fotos-productos').upload(fileName, file);

        if (!error) {
            datos.imagen_url = clienteSupabase.storage.from('fotos-productos').getPublicUrl(fileName).data.publicUrl;
        }
    }

    let error = null;
    if (idEdicion) {
        const res = await clienteSupabase.from('productos').update(datos).eq('id', idEdicion);
        error = res.error;
    } else {
        const res = await clienteSupabase.from('productos').insert([datos]);
        error = res.error;
    }

    if (error) {
        alert("Error: " + error.message);
    } else {
        mostrarNotificacion(idEdicion ? "Producto Actualizado" : "Producto Creado", "success");
        limpiarFormulario();
        if (idEdicion) nav('vista-mis-productos');
    }

    btn.disabled = false;
    btn.innerText = idEdicion ? "ACTUALIZAR" : "GUARDAR";
};

// Utils para el Formulario
window.agregarSpec = function () {
    document.getElementById('contenedor-specs').innerHTML += `<div class="spec-row" style="display:flex; gap:5px; margin-bottom:5px;"><input placeholder="Dato" class="input-std sk"><input placeholder="Valor" class="input-std sv"><button class="btn-txt-icon btn-danger" onclick="this.parentElement.remove()">x</button></div>`;
};

window.previewImg = function (e) {
    if (e.target.files[0]) {
        const r = new FileReader();
        r.onload = x => document.getElementById('img-preview').src = x.target.result;
        r.readAsDataURL(e.target.files[0]);
    }
};

window.cargarCatsSelect = async function () {
    const { data } = await clienteSupabase.from('categorias').select('*');
    const s = document.getElementById('p-cat');
    s.innerHTML = '';
    if (data) {
        data.forEach(c => s.innerHTML += `<option value="${c.id}">${c.nombre}</option>`);
    }
};

// ==========================================
// 8. MÓDULO: CATEGORÍAS
// ==========================================

window.cargarCats = async function () {
    const tbody = document.getElementById('tabla-cat');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Cargando...</td></tr>';

    const { data, error } = await clienteSupabase
        .from('categorias')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red;">Error al cargar</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    if (data && data.length > 0) {
        data.forEach(c => {
            tbody.innerHTML += `
            <tr>
                <td style="padding:10px;">${c.id}</td>
                <td style="padding:10px;"><strong>${c.nombre}</strong></td>
                <td style="padding:10px;">
                    <button onclick="delCat(${c.id})" class="btn-txt-icon btn-danger" style="background:#fff5f5; color:#dc3545; border:1px solid #dc3545; padding:5px 10px; border-radius:4px; cursor:pointer;">
                        BORRAR
                    </button>
                </td>
            </tr>`;
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#999;">Sin categorías</td></tr>';
    }
};

// 1. Función auxiliar para crear el slug (URL limpia)
function generarSlug(texto) {
    return texto
        .toString()
        .toLowerCase()
        .normalize('NFD')                 // Separa los acentos
        .replace(/[\u0300-\u036f]/g, '')  // Elimina los acentos
        .trim()
        .replace(/\s+/g, '-')             // Reemplaza espacios con guiones
        .replace(/[^\w\-]+/g, '')         // Elimina caracteres raros
        .replace(/\-\-+/g, '-');          // Evita guiones dobles
}

// 2. Tu función corregida
window.crearCat = async function () {
    const input = document.getElementById('cat-nom');
    const nombre = input.value.trim();

    if (!nombre) return alert("Escribe un nombre");

    // AQUÍ ESTÁ EL ARREGLO: Generamos el slug antes de enviar
    const slugGenerado = generarSlug(nombre);

    const { error } = await clienteSupabase
        .from('categorias')
        .insert([{
            nombre: nombre,
            slug: slugGenerado  // <-- Ahora enviamos el slug también
        }]);

    if (error) {
        alert("Error: " + error.message);
    } else {
        input.value = '';
        cargarCats();
        cargarCatsSelect();
    }
};

window.delCat = async function (id) {
    if (confirm("¿Borrar categoría? Esto podría afectar productos asociados.")) {
        const { error } = await clienteSupabase.from('categorias').delete().eq('id', id);
        if (error) alert("Error: " + error.message);
        else cargarCats();
    }
};

// ==========================================
// 9. MÓDULO: CUPONES
// ==========================================
window.cargarCups = async function () {
    const tbody = document.getElementById('tabla-cup');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#777;">Cargando...</td></tr>';

    const { data, error } = await clienteSupabase
        .from('cupones')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Error: ${error.message}</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    if (data && data.length > 0) {
        data.forEach(c => {
            tbody.innerHTML += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px 10px; color: #777;">${c.id}</td>
                <td style="padding: 12px 10px;">
                    <span style="background: #e3f2fd; color: #0d47a1; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-family: monospace;">
                        ${c.codigo}
                    </span>
                </td>
                <td style="padding: 12px 10px; font-weight: bold; color: #28a745;">${c.porcentaje_descuento}%</td>
                <td style="padding: 12px 10px; text-align: right;">
                    <button onclick="delCup(${c.id})" style="background: #fff5f5; color: #dc3545; border: 1px solid #dc3545; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.85em;">
                        ELIMINAR
                    </button>
                </td>
            </tr>`;
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#999;">No hay cupones registrados.</td></tr>';
    }
};

window.crearCup = async function () {
    const inputCodigo = document.getElementById('cup-code');
    const inputValor = document.getElementById('cup-val');

    const codigo = inputCodigo.value.trim().toUpperCase();
    const porcentaje = parseInt(inputValor.value);

    if (!codigo || isNaN(porcentaje) || porcentaje <= 0) {
        alert("⚠️ Ingresa un código y un porcentaje válido.");
        return;
    }

    const { error } = await clienteSupabase
        .from('cupones')
        .insert([{
            codigo: codigo,
            porcentaje_descuento: porcentaje,
            activo: true
        }]);

    if (error) {
        alert("❌ Error al guardar: " + error.message);
    } else {
        inputCodigo.value = "";
        inputValor.value = "";
        cargarCups();
    }
};

window.delCup = async function (id) {
    if (confirm("¿Eliminar este cupón?")) {
        const { error } = await clienteSupabase.from('cupones').delete().eq('id', id);
        if (error) alert("Error: " + error.message);
        else cargarCups();
    }
};

// ==========================================
// UTILIDAD: MODAL DE CONFIRMACIÓN (Promesa)
// ==========================================
window.mostrarConfirmacion = function (mensaje, titulo = "¿Estás seguro?") {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-confirmacion');
        const txtMensaje = document.getElementById('confirm-mensaje');
        const txtTitulo = document.getElementById('confirm-titulo');
        const btnSi = document.getElementById('btn-confirm-si');
        const btnNo = document.getElementById('btn-confirm-no');

        // Configurar textos
        txtMensaje.innerText = mensaje;
        txtTitulo.innerText = titulo;

        // Mostrar
        modal.style.display = 'flex';

        // Definir qué pasa al hacer click
        // OPCIÓN NO
        const cancelar = () => {
            modal.style.display = 'none';
            limpiarEventos();
            resolve(false); // Devuelve FALSO
        };

        // OPCIÓN SÍ
        const confirmar = () => {
            modal.style.display = 'none';
            limpiarEventos();
            resolve(true); // Devuelve VERDADERO
        };

        // Limpiar eventos anteriores para no acumular clics
        const limpiarEventos = () => {
            btnSi.removeEventListener('click', confirmar);
            btnNo.removeEventListener('click', cancelar);
        };

        // Asignar nuevos eventos
        btnSi.addEventListener('click', confirmar);
        btnNo.addEventListener('click', cancelar);
    });
};