// ==========================================
// VARIABLES GLOBALES (Caché de datos)
// ==========================================
let ventasCache = [];
let productosCache = [];

// ==========================================
// INICIALIZACIÓN Y SEGURIDAD
// ==========================================
window.addEventListener('load', async function () {
    // 1. Ocultar Loader
    const loader = document.getElementById('loader-wrapper');
    if (loader) loader.style.display = 'none';

    // 2. Verificar Sesión de Admin
    if (typeof clienteSupabase === 'undefined') return;

    const { data: { session } } = await clienteSupabase.auth.getSession();
    
    // CAMBIA 'ivantonix@gmail.com' POR TU CORREO REAL
    if (!session || session.user.email !== 'ivantonix@gmail.com') {
        window.location.href = "index.html";
        return;
    }

    // 3. Cargar vista inicial
    cargarVentas();
});

window.cerrarSesionAdmin = async function() {
    await clienteSupabase.auth.signOut();
    window.location.href = "index.html";
};

// ==========================================
// NAVEGACIÓN (TABS)
// ==========================================
window.nav = function(vistaId, btnElement) {
    // Ocultar paneles
    document.querySelectorAll('.card-panel').forEach(panel => panel.classList.remove('active-view'));
    // Mostrar seleccionado
    document.getElementById(vistaId).classList.add('active-view');

    // Actualizar menú
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    // Cargar datos
    if (vistaId === 'vista-ventas') cargarVentas();
    if (vistaId === 'vista-mis-productos') cargarProductosLista();
    if (vistaId === 'vista-inventario') cargarRentabilidad();
    if (vistaId === 'vista-categorias') cargarCats();
    if (vistaId === 'vista-cupones') cargarCups();
    if (vistaId === 'vista-agregar') cargarCatsSelect();
};

// ==========================================
// 1. GESTIÓN DE PEDIDOS
// ==========================================
window.cargarVentas = async function() {
    const tbody = document.getElementById('tabla-ventas');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Cargando pedidos...</td></tr>';
    
    const { data } = await clienteSupabase.from('ventas').select('*').order('id', { ascending: false });
    tbody.innerHTML = '';
    ventasCache = data;

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay pedidos recientes.</td></tr>';
        return;
    }

    data.forEach(v => {
        const pagado = v.estado === 'pagado';
        const colorBg = pagado ? '#d4edda' : '#fff3cd';
        
        const selectHTML = `
            <select onchange="cambiarEstadoPedido(this, ${v.id})" 
                    style="background:${colorBg}; padding:5px; border-radius:4px; border:1px solid #ccc; font-family:inherit;">
                <option value="pendiente_pago" ${!pagado ? 'selected' : ''}>⏳ Pendiente</option>
                <option value="pagado" ${pagado ? 'selected' : ''}>✅ Pagado</option>
            </select>`;

        tbody.innerHTML += `
            <tr>
                <td><strong>#${v.id}</strong></td>
                <td>${new Date(v.fecha_compra).toLocaleDateString()}</td>
                <td style="color:#0056b3; font-weight:bold;">$${v.total.toFixed(2)}</td>
                <td>${selectHTML}</td>
                <td>
                    <div style="display:flex; gap:5px;">
                        <input id="paq-${v.id}" value="${v.paqueteria || ''}" class="input-std" style="width:70px;" placeholder="Paq.">
                        <input id="guia-${v.id}" value="${v.numero_guia_envio !== 'PENDIENTE' ? v.numero_guia_envio : ''}" class="input-std" style="width:90px;" placeholder="Guía">
                    </div>
                </td>
                <td>
                    <div style="display:flex; gap:5px;">
                        <button onclick="verPedido(${v.id})" class="btn-txt-icon btn-info" title="Ver Detalles">
                            <span class="material-icons" style="font-size:16px">visibility</span> Ver
                        </button>
                        <button onclick="guardarGuia(${v.id})" class="btn-txt-icon btn-primary" title="Guardar Guía">
                            <span class="material-icons" style="font-size:16px">save</span> Guardar
                        </button>
                    </div>
                </td>
            </tr>`;
    });
};

window.verPedido = function(id) {
    const venta = ventasCache.find(x => x.id === id);
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

window.cambiarEstadoPedido = async function(selectElement, id) {
    const nuevoEstado = selectElement.value;
    await clienteSupabase.from('ventas').update({ estado: nuevoEstado }).eq('id', id);
    mostrarNotificacion("Estado actualizado", "success");
    selectElement.style.background = (nuevoEstado === 'pagado') ? '#d4edda' : '#fff3cd';
};

window.guardarGuia = async function(id) {
    await clienteSupabase.from('ventas').update({ 
        numero_guia_envio: document.getElementById(`guia-${id}`).value, 
        paqueteria: document.getElementById(`paq-${id}`).value 
    }).eq('id', id);
    mostrarNotificacion("Datos de envío guardados", "success");
};

// ==========================================
// 2. MIS PRODUCTOS
// ==========================================
window.cargarProductosLista = async function() {
    const tbody = document.getElementById('tabla-lista-productos');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Cargando...</td></tr>';
    const { data } = await clienteSupabase.from('productos').select('*, categorias(nombre)').order('id', { ascending: false });
    tbody.innerHTML = '';
    productosCache = data;

    data.forEach(p => {
        const imgUrl = p.imagen_url || 'https://via.placeholder.com/50';
        tbody.innerHTML += `
            <tr>
                <td><img src="${imgUrl}" style="width:45px; height:45px; object-fit:contain; border:1px solid #eee; border-radius:4px; padding:2px;"></td>
                <td><strong>${p.nombre}</strong><br><small style="color:#888;">SKU: ${p.sku || '-'}</small></td>
                <td>${p.categorias ? p.categorias.nombre : '-'}</td>
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

window.borrarProd = async function(id) {
    if (confirm("¿Estás seguro de ELIMINAR este producto?")) {
        await clienteSupabase.from('productos').delete().eq('id', id);
        mostrarNotificacion("Producto eliminado", "success");
        cargarProductosLista();
    }
};

// ==========================================
// 3. RENTABILIDAD
// ==========================================
window.cargarRentabilidad = async function() {
    const tbody = document.getElementById('tabla-rentabilidad');
    tbody.innerHTML = '';
    const { data } = await clienteSupabase.from('productos').select('*').order('nombre');
    
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

window.recalcularFila = function(id, precioBase) {
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

window.guardarInventario = async function(id) {
    await clienteSupabase.from('productos').update({
        precio_compra: document.getElementById(`c-${id}`).value,
        descuento: document.getElementById(`d-${id}`).value,
        stock_actual: document.getElementById(`s-${id}`).value
    }).eq('id', id);
    mostrarNotificacion("Inventario guardado", "success");
};

// ==========================================
// 4. AGREGAR / EDITAR PRODUCTO
// ==========================================
window.limpiarFormulario = function() {
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
    agregarSpec();
};

window.editarProd = function(id) {
    const p = productosCache.find(x => x.id === id);
    if (!p) return;
    nav('vista-agregar');
    document.getElementById('titulo-form').innerText = "✏️ Editar Producto";
    document.getElementById('btn-submit').innerText = "ACTUALIZAR";
    document.getElementById('btn-cancel').style.display = 'block';
    document.getElementById('p-id-edicion').value = p.id;

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

    cargarCatsSelect().then(() => { if (p.categoria_id) document.getElementById('p-cat').value = p.categoria_id; });

    const cont = document.getElementById('contenedor-specs'); cont.innerHTML = '';
    if (p.especificaciones) {
        Object.entries(p.especificaciones).forEach(([k, v]) => {
            cont.innerHTML += `<div class="spec-row" style="display:flex; gap:5px; margin-bottom:5px;"><input class="input-std sk" value="${k}"><input class="input-std sv" value="${v}"><button onclick="this.parentElement.remove()" class="btn-txt-icon btn-danger">x</button></div>`;
        });
    }
};

window.procesarProducto = async function() {
    const btn = document.getElementById('btn-submit');
    btn.disabled = true; btn.innerText = "Procesando...";
    const idEdicion = document.getElementById('p-id-edicion').value;
    
    let specs = {};
    document.querySelectorAll('.spec-row').forEach(row => {
        const k = row.querySelector('.sk').value; const v = row.querySelector('.sv').value;
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

    const fileInput = document.getElementById('p-img-file');
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
        await clienteSupabase.storage.from('fotos-productos').upload(fileName, file);
        datos.imagen_url = clienteSupabase.storage.from('fotos-productos').getPublicUrl(fileName).data.publicUrl;
    }

    if (idEdicion) await clienteSupabase.from('productos').update(datos).eq('id', idEdicion);
    else await clienteSupabase.from('productos').insert([datos]);

    mostrarNotificacion(idEdicion ? "Producto Actualizado" : "Producto Creado", "success");
    limpiarFormulario();
    if (idEdicion) nav('vista-mis-productos');
    btn.disabled = false; btn.innerText = idEdicion ? "ACTUALIZAR" : "GUARDAR";
};

// Utils Form
window.agregarSpec = function() {
    document.getElementById('contenedor-specs').innerHTML += `<div class="spec-row" style="display:flex; gap:5px; margin-bottom:5px;"><input placeholder="Dato" class="input-std sk"><input placeholder="Valor" class="input-std sv"><button class="btn-txt-icon btn-danger" onclick="this.parentElement.remove()">x</button></div>`;
};
window.previewImg = function(e) { 
    if (e.target.files[0]) {
        const r = new FileReader(); 
        r.onload = x => document.getElementById('img-preview').src = x.target.result; 
        r.readAsDataURL(e.target.files[0]);
    }
};
window.cargarCatsSelect = async function() {
    const { data } = await clienteSupabase.from('categorias').select('*');
    const s = document.getElementById('p-cat'); s.innerHTML = '';
    if (data) data.forEach(c => s.innerHTML += `<option value="${c.id}">${c.nombre}</option>`);
};

// ==========================================
// 5. & 6. CATEGORÍAS Y CUPONES
// ==========================================
window.cargarCats = async function() {
    const t = document.getElementById('tabla-cat'); t.innerHTML = '';
    const { data } = await clienteSupabase.from('categorias').select('*');
    if(data) data.forEach(c => t.innerHTML += `<tr><td>${c.id}</td><td><strong>${c.nombre}</strong></td><td><button onclick="delCat(${c.id})" class="btn-txt-icon btn-danger">BORRAR</button></td></tr>`);
};
window.crearCat = async function() { await clienteSupabase.from('categorias').insert([{nombre:document.getElementById('cat-nom').value}]); cargarCats(); };
window.delCat = async function(id) { if(confirm("Borrar?")) await clienteSupabase.from('categorias').delete().eq('id', id); cargarCats(); };

window.cargarCups = async function() {
    const t = document.getElementById('tabla-cup'); t.innerHTML = '';
    const { data } = await clienteSupabase.from('cupones').select('*');
    if(data) data.forEach(c => t.innerHTML += `<tr><td><strong>${c.codigo}</strong></td><td>${c.porcentaje_descuento}%</td><td><button onclick="delCup(${c.id})" class="btn-txt-icon btn-danger">BORRAR</button></td></tr>`);
};
window.crearCup = async function() { await clienteSupabase.from('cupones').insert([{codigo:document.getElementById('cup-code').value.toUpperCase(), porcentaje_descuento:document.getElementById('cup-val').value, activo:true}]); cargarCups(); };
window.delCup = async function(id) { if(confirm("Borrar?")) await clienteSupabase.from('cupones').delete().eq('id', id); cargarCups(); };