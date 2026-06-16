const API_URL = 'http://localhost:4000/';
let previousOrdersState = {};

const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-3.mp3');

const locationMap = {
  "PENDING": "Gudang Penjual",
  "PROCESSING": "Pusat Sortir",
  "SHIPPED": "Dalam Perjalanan",
  "DELIVERED": "Telah Sampai"
};

// --- UTILITY FETCH ---
async function fetchGraphQL(query, variables = {}) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({query, variables})
    });
    const json = await res.json();
    if (json.errors) {
      console.error("GraphQL Error:", json.errors);
      throw new Error(json.errors[0].message);
    }
    return json;
  } catch (error) {
    console.error("Fetch Error:", error);
    throw error;
  }
}

// --- TOAST NOTIFICATION ---
function showToast(id, status, area) {
  try { audio.play(); } catch(e) {} // Abaikan error jika autoplay diblokir browser
  
  const toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<strong>Order #${id}</strong><br>Status: ${status}<br>Posisi: ${area}`;
  
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// --- 1. LOAD KATEGORI UNTUK FORM (SELLER CENTER) ---
async function loadCategoriesForForm() {
  const select = document.getElementById('addCategory');
  if (!select) return;

  try {
    const query = `query { categories { id name } }`;
    const res = await fetchGraphQL(query);
    
    select.innerHTML = '<option value="">Pilih Kategori...</option>';
    if (res.data && res.data.categories) {
      res.data.categories.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      });
    }
  } catch (error) {
    select.innerHTML = '<option value="">Gagal memuat kategori</option>';
  }
}

// --- 2. LOAD PRODUK UNTUK PEMBELI ---
async function loadProducts() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  try {
    const query = `query { products { id name price stock category { name } } }`;
    const res = await fetchGraphQL(query);

    grid.innerHTML = '';
    if (res.data && res.data.products && res.data.products.length > 0) {
      res.data.products.forEach(p => {
        grid.innerHTML += `
          <div class="product-card">
            ${p.stock < 5 ? '<div class="discount" style="background:orange;">Stok Menipis</div>' : ''}
            <div class="product-image"><i class="fa fa-box fa-3x" style="color:#ccc;"></i></div>
            <div style="font-weight:bold; margin-top:10px;">${p.name}</div>
            <div style="font-size: 12px; color: gray;">${p.category ? p.category.name : 'Umum'}</div>
            <div class="product-price" style="margin: 5px 0;">Rp ${p.price.toLocaleString('id-ID')}</div>
            <div style="font-size: 12px; margin-bottom:10px;">Stok: ${p.stock}</div>
            <button onclick="buy('${p.id}')" style="width:100%; padding:8px; background:#00AA5B; color:white; border:none; border-radius:4px; cursor:pointer;">
              <i class="fa fa-cart-plus"></i> Beli
            </button>
          </div>
        `;
      });
    } else {
      grid.innerHTML = '<p>Belum ada produk yang dijual.</p>';
    }
  } catch (error) {
    grid.innerHTML = `<p style="color:red;">Gagal memuat produk: ${error.message}</p>`;
  }
}

// --- 3. LOAD DATA UNTUK TABEL ADMIN ---
async function loadAdminTable() {
  const tbody = document.getElementById('adminProductTable');
  if (!tbody) return;

  try {
    const query = `query { products { id name price stock } }`;
    const res = await fetchGraphQL(query);
    
    tbody.innerHTML = '';
    if (res.data && res.data.products) {
      res.data.products.forEach(p => {
        tbody.innerHTML += `
          <tr>
            <td>${p.id}</td>
            <td>${p.name}</td>
            <td>Rp ${p.price.toLocaleString('id-ID')}</td>
            <td>${p.stock}</td>
            <td>
              <button class="btn-edit" onclick="editProduct('${p.id}')"><i class="fa fa-pencil"></i> Edit Stok</button>
              <button class="btn-delete" onclick="deleteProduct('${p.id}')"><i class="fa fa-trash"></i> Hapus</button>
            </td>
          </tr>
        `;
      });
    }
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">Gagal memuat data</td></tr>`;
  }
}

// --- 4. PEMBELIAN (BUY) ---
async function buy(id){
  const name = prompt("Masukkan Nama Penerima:");
  if(!name || name.trim() === "") return;

  const mutation = `
    mutation($input: CreateOrderInput!){
      createOrder(input: $input) { id status }
    }
  `;

  try {
    await fetchGraphQL(mutation, {
      input: { customerName: name, items: [{ productId: id, quantity: 1 }] }
    });
    alert("Pesanan berhasil dibuat!");
    loadProducts(); // Refresh stok di tampilan pembeli
    loadAdminTable(); // Refresh stok di tampilan admin
    loadOrders(); // Refresh status tracking
  } catch (error) {
    alert("Gagal membuat pesanan: " + error.message);
  }
}

// --- 5. LIVE TRACKING (REAL-TIME) ---
async function loadOrders(){
  const trackingList = document.getElementById('trackingList');
  if (!trackingList) return;

  try {
    const query = `query { orders { id status customerName } }`;
    const res = await fetchGraphQL(query);

    let html = '';
    const statusOrder = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"];

    if (res.data && res.data.orders && res.data.orders.length > 0) {
      res.data.orders.forEach(o => {
        const area = locationMap[o.status] || "Dibatalkan";
        
        // Cek apakah ada perubahan status (untuk memunculkan Toast)
        if(previousOrdersState[o.id] && previousOrdersState[o.id] !== o.status){
          showToast(o.id, o.status, area);
        }
        previousOrdersState[o.id] = o.status;

        const currentIndex = statusOrder.indexOf(o.status);

        html += `
          <div style="background: white; padding: 15px; margin-bottom: 15px; border-radius: 8px; border: 1px solid #ddd;">
            <div style="font-weight: bold; margin-bottom: 10px;">📦 Order #${o.id} - ${o.customerName}</div>
            <div class="timeline" style="display:flex; justify-content:space-between; margin-bottom:10px;">
              <div class="step ${currentIndex >= 0 ? 'active' : ''}">Pesan</div>
              <div class="step ${currentIndex >= 1 ? 'active' : ''}">Proses</div>
              <div class="step ${currentIndex >= 2 ? 'active' : ''}">Kirim</div>
              <div class="step ${currentIndex >= 3 ? 'active' : ''}">Sampai</div>
            </div>
            <div style="font-size:12px; color:gray;"><i class="fa fa-map-marker-alt"></i> Posisi Saat Ini: ${area}</div>
          </div>
        `;
      });
    } else {
      html = '<p>Belum ada pesanan aktif.</p>';
    }

    trackingList.innerHTML = html;
  } catch (error) {
    trackingList.innerHTML = `<p style="color:red;">Gagal memuat tracking</p>`;
  }
}

// --- 7. ADMIN UPDATE PRODUCT (Biarkan di luar agar bisa dipanggil tombol HTML) ---
async function editProduct(id) {
  const newStock = prompt("Masukkan jumlah stok terbaru:");
  if (newStock === null || newStock === "") return;

  const mutation = `
    mutation($id: ID!, $input: UpdateProductInput!) {
      updateProduct(id: $id, input: $input) { id stock }
    }
  `;

  try {
    await fetchGraphQL(mutation, {
      id: id,
      input: { stock: parseInt(newStock) }
    });
    loadProducts();
    loadAdminTable();
  } catch (error) {
    alert("Gagal update stok: " + error.message);
  }
}

// --- 8. ADMIN DELETE PRODUCT (Biarkan di luar agar bisa dipanggil tombol HTML) ---
async function deleteProduct(id) {
  if (!confirm("Yakin ingin menghapus produk ini?")) return;

  const mutation = `
    mutation($id: ID!) {
      deleteProduct(id: $id)
    }
  `;

  try {
    await fetchGraphQL(mutation, { id: id });
    loadProducts();
    loadAdminTable();
  } catch (error) {
    alert("Gagal menghapus produk: " + error.message);
  }
}

// --- INISIALISASI AWAL & PENGIKATAN FORM ---
document.addEventListener('DOMContentLoaded', () => {
  loadCategoriesForForm();
  loadProducts();
  loadAdminTable();
  loadOrders();

  // Sinkronisasi Tracking tiap 3 detik
  setInterval(loadOrders, 3000);

  // --- 6. ADMIN CREATE PRODUCT (Dipindah ke dalam sini) ---
  const formAddProduct = document.getElementById('formAddProduct');
  if (formAddProduct) {
    formAddProduct.addEventListener('submit', async (e) => {
      e.preventDefault(); // Mencegah halaman me-refresh sendiri
      
      const name = document.getElementById('addName').value;
      const price = parseFloat(document.getElementById('addPrice').value);
      const stock = parseInt(document.getElementById('addStock').value);
      const categoryId = document.getElementById('addCategory').value;

      if(!categoryId) {
        alert("Silakan pilih kategori terlebih dahulu!");
        return;
      }

      const mutation = `
        mutation($input: CreateProductInput!) {
          createProduct(input: $input) { id name }
        }
      `;

      try {
        await fetchGraphQL(mutation, {
          input: { name, price, stock, categoryId }
        });
        alert("Produk berhasil ditambahkan!");
        formAddProduct.reset(); // Mengosongkan form
        loadProducts(); // Merender ulang grid katalog
        loadAdminTable(); // Merender ulang tabel admin
      } catch (error) {
        alert("Gagal menambah produk: " + error.message);
      }
    });
  }
  // Sinkronisasi Tracking tiap 3 detik
  setInterval(loadOrders, 3000);
});