const API_URL = 'http://localhost:4000/';
let previousOrdersState = {};

const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-3.mp3');

const locationMap = {
  "PENDING": "Gudang Penjual",
  "PROCESSING": "Pusat Sortir",
  "SHIPPED": "Dalam Perjalanan",
  "DELIVERED": "Telah Sampai",
  "CANCELLED": "Dibatalkan"
};

// =========================================
// UTILITY FETCH GRAPHQL
// =========================================
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

// =========================================
// TOAST NOTIFICATION (POP-UP)
// =========================================
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

// =========================================
// 1. LOAD KATEGORI UNTUK FORM (READ)
// =========================================
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

// =========================================
// 2. LOAD PRODUK UNTUK PEMBELI (READ)
// =========================================
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
    grid.innerHTML = `<p style="color:red;">Gagal memuat produk</p>`;
  }
}

// =========================================
// 3. LOAD DATA UNTUK TABEL ADMIN (READ)
// =========================================
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

// =========================================
// 4. PEMBELIAN (BUKA UI MODAL)
// =========================================
function buy(id) {
  // Masukkan ID produk ke dalam form tersembunyi
  document.getElementById('checkoutProductId').value = id;
  // Tampilkan Modal
  document.getElementById('checkoutModal').classList.add('active');
}

// Fungsi untuk menutup Modal (TIDAK BOLEH di dalam function buy)
function closeCheckoutModal() {
  document.getElementById('checkoutModal').classList.remove('active');
  document.getElementById('checkoutForm').reset();
}

// =========================================
// 5. LIVE TRACKING (READ REAL-TIME)
// =========================================
async function loadOrders(){
  const trackingList = document.getElementById('trackingList');
  if (!trackingList) return;

  try {
    // Tambahkan shippingAddress pada Query
    const query = `query { orders { id status customerName shippingAddress } }`;
    const res = await fetchGraphQL(query);

    let html = '';
    const statusOrder = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"];

    if (res.data && res.data.orders && res.data.orders.length > 0) {
      res.data.orders.forEach(o => {
        const area = locationMap[o.status] || "Dibatalkan";
        
        if(previousOrdersState[o.id] && previousOrdersState[o.id] !== o.status){
          showToast(o.id, o.status, area);
        }
        previousOrdersState[o.id] = o.status;

        const currentIndex = statusOrder.indexOf(o.status);

        html += `
          <div style="background: white; padding: 15px; margin-bottom: 15px; border-radius: 8px; border: 1px solid #ddd;">
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
              <div style="font-weight: bold;">📦 Order #${o.id} - ${o.customerName}</div>
              
              <select onchange="updateOrderStatus('${o.id}', this.value)" style="padding: 5px; border-radius: 4px; border: 1px solid #ccc; font-size: 12px; background: #f8f9fa; cursor: pointer;">
                <option value="PENDING" ${o.status === 'PENDING' ? 'selected' : ''}>Status: PENDING</option>
                <option value="PROCESSING" ${o.status === 'PROCESSING' ? 'selected' : ''}>Status: PROCESSING</option>
                <option value="SHIPPED" ${o.status === 'SHIPPED' ? 'selected' : ''}>Status: SHIPPED</option>
                <option value="DELIVERED" ${o.status === 'DELIVERED' ? 'selected' : ''}>Status: DELIVERED</option>
                <option value="CANCELLED" ${o.status === 'CANCELLED' ? 'selected' : ''}>Status: CANCELLED</option>
              </select>
            </div>
            
            <div style="font-size: 12px; color: #555; margin-bottom: 15px;">
              <i class="fa fa-home"></i> Alamat: ${o.shippingAddress}
            </div>

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

// =========================================
// 6. UPDATE ORDER STATUS (UPDATE MUTATION)
// =========================================
async function updateOrderStatus(id, newStatus) {
  const mutation = `
    mutation($id: ID!, $status: String!) {
      updateOrderStatus(id: $id, status: $status) { id status }
    }
  `;
  try {
    await fetchGraphQL(mutation, { id: id, status: newStatus });
    loadOrders(); // Memaksa UI langsung memuat ulang
  } catch (error) {
    alert("Gagal mengubah status pesanan: " + error.message);
  }
}

// =========================================
// 7. ADMIN UPDATE PRODUCT (UPDATE MUTATION)
// =========================================
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

// =========================================
// 8. ADMIN DELETE PRODUCT (DELETE MUTATION)
// =========================================
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

// =========================================
// 9. INISIALISASI AWAL & FORM BINDING
// =========================================
document.addEventListener('DOMContentLoaded', () => {
  // Panggil semua data saat halaman selesai dimuat
  loadCategoriesForForm();
  loadProducts();
  loadAdminTable();
  loadOrders();

  // Sinkronisasi Tracking Real-Time tiap 3 detik
  setInterval(loadOrders, 3000);

  // Binding Form Tambah Produk (CREATE MUTATION)
  const formAddProduct = document.getElementById('formAddProduct');
  if (formAddProduct) {
    formAddProduct.addEventListener('submit', async (e) => {
      e.preventDefault(); 
      
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
        formAddProduct.reset(); 
        loadProducts(); 
        loadAdminTable(); 
      } catch (error) {
        alert("Gagal menambah produk: " + error.message);
      }
    });
  }

  // =========================================
  // BINDING FORM CHECKOUT (UI BARU)
  // =========================================
  const checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const id = document.getElementById('checkoutProductId').value;
      const name = document.getElementById('checkoutName').value;
      const address = document.getElementById('checkoutAddress').value;

      const mutation = `
        mutation($input: CreateOrderInput!){
          createOrder(input: $input) { id status }
        }
      `;

      try {
        // Ubah tombol jadi status loading agar terlihat profesional
        const btnSubmit = checkoutForm.querySelector('.btn-submit-modal');
        const originalText = btnSubmit.innerHTML;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';
        btnSubmit.disabled = true;

        await fetchGraphQL(mutation, {
          input: { 
            customerName: name, 
            shippingAddress: address, 
            items: [{ productId: id, quantity: 1 }] 
          }
        });
        
        // Kembalikan tombol seperti semula
        btnSubmit.innerHTML = originalText;
        btnSubmit.disabled = false;

        alert("Pesanan berhasil dibuat!");
        closeCheckoutModal(); // Tutup modal otomatis
        loadProducts(); 
        loadAdminTable(); 
        loadOrders(); 
      } catch (error) {
        alert("Gagal membuat pesanan: " + error.message);
        checkoutForm.querySelector('.btn-submit-modal').disabled = false;
      }
    });
  }
});