/* ==========================================
   🔹 CONFIGURACIÓN GLOBAL Y ESTADO
   ========================================== */
const URL_SHEETS = "https://script.google.com/macros/s/AKfycbx3llkL4WfrDORPXElfA6uv7-WGfkkB68uMpXaeJ0mDaekVKRcKxzsCTo_LZvols_tN/exec";

const HORARIOS_ATENCION = {
    1: { inicio: "19:00", fin: "23:59" }, // Lun
    2: { inicio: "11:00", fin: "23:59" }, // Mar
    3: { inicio: "11:00", fin: "23:59" }, // Mie
    4: { inicio: "19:00", fin: "23:59" }, // Jue
    5: { inicio: "19:00", fin: "01:00" }, // Vie
    6: { inicio: "19:00", fin: "01:00" }, // Sab
    0: { inicio: "19:00", fin: "23:59" }  // Dom
};

let carrito = [];
let productosGlobal = [];
let productoSeleccionado = null;

/* ==========================================
   🔹 INICIALIZACIÓN
   ========================================== */
document.addEventListener("DOMContentLoaded", () => {
    cargarDesdeSheets();
    inicializarEventosMenu();
    configurarEventosBotones();
});

function configurarEventosBotones() {
    // Botón de agregar al carrito (Detalle)
    const btnAgregar = document.getElementById("btn-agregar-detalle");
    if (btnAgregar) {
        btnAgregar.onclick = () => {
            if (!estaAbierto()) return mostrarAvisoCerrado();
            const cant = parseInt(document.getElementById("cant-detalle").value);
            if (productoSeleccionado) agregarDesdeDetalle(productoSeleccionado, cant);
        };
    }
    // Cerrar acordeón de horarios al hacer clic fuera
    document.addEventListener('click', (e) => {
        const acordeon = document.getElementById('flush-horarios');
        const boton = document.querySelector('[data-bs-target="#flush-horarios"]');
        if (acordeon?.classList.contains('show') && !acordeon.contains(e.target) && !boton.contains(e.target)) {
            bootstrap.Collapse.getOrCreateInstance(acordeon).hide();
        }
    });
}

/* ==========================================
   🔹 LÓGICA DE HORARIOS
   ========================================== */
function estaAbierto() {
    const ahora = new Date();
    const dia = ahora.getDay();
    const hActual = ahora.getHours() * 100 + ahora.getMinutes();
    const h = HORARIOS_ATENCION[dia];
    if (!h) return false;
    const [hI, mI] = h.inicio.split(":").map(Number);
    const [hF, mF] = h.fin.split(":").map(Number);
    const inicio = hI * 100 + mI;
    const fin = hF * 100 + mF;
    return fin < inicio ? (hActual >= inicio || hActual <= fin) : (hActual >= inicio && hActual <= fin);
}

function mostrarAvisoCerrado() {
    const modal = new bootstrap.Modal(document.getElementById('modalCerrado'));
    modal.show();
}

/* ==========================================
   🔹 DATOS Y CATÁLOGO
   ========================================== */
function cargarDesdeSheets() {
    const url = `${URL_SHEETS}?v=${new Date().getTime()}`;
    fetch(url, { method: 'GET', redirect: 'follow' })
        .then(r => r.json())
        .then(data => renderizarProductos(data))
        .catch(err => {
            console.error("Error:", err);
            const cont = document.getElementById("productos");
            if (cont) cont.innerHTML = "<p class='text-center text-danger'>Error al conectar con el menú.</p>";
        });
}

function renderizarProductos(data) {
    const contenedor = document.getElementById("productos");
    if (!contenedor) return;
    let htmlFinal = "";
    let globalIndex = 0;
    productosGlobal = [];
    const categorias = ["hamburguesas", "papas", "bebidas", "promos"];
    categorias.forEach(cat => {
        if (data[cat]?.length > 0) {
            data[cat].forEach(p => {
                const precio = parseFloat(p.precio) || 0;
                productosGlobal.push({ ...p, precio, categoria: cat });
                /* Busca esta parte dentro de la función renderizarProductos y reemplázala */
               htmlFinal += `
                    <div class="col-12 col-md-6 producto" data-categoria="${cat}">
                        <div class="card producto-card shadow-sm mb-2" onclick="verDetalle(${globalIndex})">
                            <div class="info-container">
                                <h6 class="fw-bold mb-1">${p.nombre.toUpperCase()}</h6>
                                <p class="descripcion-corta mb-2 text-muted small">${p.detalle || 'Opción de La Reco.'}</p>
                                <div class="precio text-success fw-bold">$${precio.toLocaleString('es-AR')}</div>
                            </div>
                            <div class="img-container">
                                <img src="${p.imagen}" alt="${p.nombre}" loading="lazy">
                            </div>
                        </div>
                    </div>`;
                globalIndex++;
            });
        }
    });
    contenedor.innerHTML = htmlFinal || "<p class='text-center'>No hay productos disponibles.</p>";
}

function verDetalle(index) {
    const p = productosGlobal[index];
    if (!p) return;
    productoSeleccionado = { ...p, indexGlobal: index };
    document.getElementById("detalle-img").src = p.imagen;
    document.getElementById("detalle-nombre").innerText = p.nombre.toUpperCase();
    document.getElementById("detalle-precio").innerText = `$${p.precio.toLocaleString('es-AR')}`;
    document.getElementById("cant-detalle").value = 1;
    const desc = document.getElementById("detalle-descripcion");
    if (desc) desc.innerText = p.detalle || 'Opción de La Reco.';
    document.getElementById("hero").classList.add("d-none");
    document.getElementById("contenedor-catalogo").classList.add("d-none");
    document.getElementById("vista-detalle").classList.remove("d-none");
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ==========================================
   🔹 CARRITO Y COMPRA
   ========================================= */
function agregarDesdeDetalle(prod, cant) {
    const existe = carrito.find(p => p.nombre === prod.nombre);
    if (existe) existe.cantidad += cant;
    else carrito.push({ ...prod, cantidad: cant });
    actualizarCarrito();
    const btn = document.getElementById("btn-agregar-detalle");
    btn.disabled = true;
    setTimeout(() => {
        btn.innerHTML = 'AÑADIR AL PEDIDO <i class="bi bi-cart4"></i>';
        btn.disabled = false;
    }, 1500);
}

function actualizarCarrito() {
    const listaModal = document.getElementById("listaModal");
    const totalModal = document.getElementById("totalModal");
    const contadorNav = document.getElementById("contadorNav");
    let html = "", total = 0, items = 0;
    carrito.forEach((p, i) => {
        const sub = p.precio * p.cantidad;
        total += sub; items += p.cantidad;
        
    });
    if (listaModal) listaModal.innerHTML = carrito.length === 0 ? "<p class='text-center py-4'>Tu carrito está vacío 🍔</p>" : html;
    if (totalModal) totalModal.innerText = total.toLocaleString('es-AR');
    if (contadorNav) {
        contadorNav.innerText = items;
        contadorNav.style.display = items > 0 ? "block" : "none";
    }
    const btnFinalizar = document.querySelector('#modalCarrito .btn-success');
    if (btnFinalizar) {
        if (!estaAbierto()) {
            btnFinalizar.classList.replace('btn-success', 'btn-secondary');
            btnFinalizar.innerHTML = 'LOCAL CERRADO 😴';
            btnFinalizar.onclick = mostrarAvisoCerrado;
        } else {
            btnFinalizar.classList.replace('btn-secondary', 'btn-success');
            btnFinalizar.innerHTML = 'FINALIZAR PEDIDO';
            btnFinalizar.onclick = enviarPedidoWhatsApp;
        }
    }
}

async function enviarPedidoWhatsApp() {
    const nom = document.getElementById('nombreCliente')?.value.trim().toUpperCase();
    const dir = document.getElementById('direccionModal')?.value.trim().toUpperCase();
    const tel = document.getElementById('telefonoCliente')?.value.trim() || "N/A";
    if (!estaAbierto()) return mostrarAvisoCerrado();
    if (!nom || !dir) {
        document.getElementById('nombreCliente').classList.add("is-invalid");
        document.getElementById('direccionModal').classList.add("is-invalid");
        return mostrarToast("⚠️ Completa nombre y dirección");
    }
    let total = 0, itemsWS = "", itemsSheets = [];
    carrito.forEach(p => {
        total += (p.precio * p.cantidad);
        itemsSheets.push(`${p.cantidad}x ${p.nombre.toUpperCase()}`);
        itemsWS +=`✅ ${p.cantidad}x - ${p.nombre.toUpperCase()}\n`;
    });
    const pedidoNum = obtenerSiguientePedido();
    const fecha = new Date().toLocaleString('es-AR');
    enviarPedidoASheets({ pedido: pedidoNum, fecha, cliente: nom, telefono: tel, productos: itemsSheets.join(", "), total, direccion: dir });
    
    const linkApp = "link.mercadopago.com.ar/home"; 
    
    let msg =`🛒 *PEDIDO N° ${pedidoNum}*\n📅 ${fecha}\n👤 *CLIENTE:* ${nom}\n--------------------------\n${itemsWS}--------------------------\n📍 *Dirección:* ${dir}\n💰 *Total:* $${total.toLocaleString('es-AR')}\n\n`;
    msg +=`🤝 *MERCADO PAGO:*\n`;
    msg +=`📲 *TOCÁ EN "INICIAR SESIÓN"*\n`;
    msg +=`👇 App: ${linkApp}\n`;
    msg +=`👉 Alias: *walter30mp*\n`;
    msg +=`😎 *No olvides mandar el comprobante de pago*\n\n`;
    msg +=`🙏 ¡Muchas gracias!`;

    window.open(`https://wa.me/5491127461954?text=${encodeURIComponent(msg)}`, '_blank');
}

/* ==========================================
   🔹 UTILIDADES
   ========================================== */
function buscarProducto() {
    if (!document.getElementById("vista-detalle").classList.contains("d-none")) volverAlCatalogo();
    const busqueda = document.getElementById('buscador').value.toLowerCase();
    document.querySelectorAll('.producto').forEach(tarjeta => {
        const nombre = tarjeta.querySelector('h6').innerText.toLowerCase();
        tarjeta.style.display = nombre.includes(busqueda) ? "block" : "none";
    });
}

function filtrar(cat) {
    volverAlCatalogo();
    document.querySelectorAll('.producto').forEach(p => {
        p.style.display = (cat === 'todos' || p.getAttribute('data-categoria') === cat) ? "block" : "none";
    });
}

function volverAlCatalogo() {
    document.getElementById("hero").classList.remove("d-none");
    document.getElementById("contenedor-catalogo").classList.remove("d-none");
    document.getElementById("vista-detalle").classList.add("d-none");
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function modificarCantidadCarrito(i, c) {
    if (carrito[i]) {
        carrito[i].cantidad += c;
        if (carrito[i].cantidad <= 0) eliminarDelCarrito(i);
        else actualizarCarrito();
    }
}

function eliminarDelCarrito(i) {
    carrito.splice(i, 1);
    actualizarCarrito();
}

function cambiarCantidadDetalle(v) {
    const input = document.getElementById("cant-detalle");
    if (input) input.value = Math.max(1, (parseInt(input.value) || 1) + v);
}

function intentarAbrirCarrito() {
    if (carrito.length === 0) return mostrarToast("🛒 El carrito está vacío");
    new bootstrap.Modal(document.getElementById('modalCarrito')).show();
}

async function enviarPedidoASheets(datos) {
    try { await fetch(URL_SHEETS, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) }); }
    catch (e) { console.error("Error Sheets:", e); }
}

function inicializarEventosMenu() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            const nav = document.getElementById('menuNav');
            if (nav?.classList.contains('show')) bootstrap.Collapse.getInstance(nav).hide();
        });
    });
}

function obtenerSiguientePedido() {
    let cuenta = (parseInt(localStorage.getItem('contadorAbsoluto')) || 1);
    localStorage.setItem('contadorAbsoluto', cuenta + 1);
    return `${Math.floor(cuenta / 10000).toString().padStart(3, '0')}-${(cuenta % 10000).toString().padStart(4, '0')}`;
}

function mostrarToast(m) {
    const t = document.createElement('div');
    t.className = "custom-toast show"; t.innerText = m;
    document.body.appendChild(t);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 500); }, 2500);
}