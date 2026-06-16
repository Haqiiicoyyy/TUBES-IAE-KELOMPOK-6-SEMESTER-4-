const API_URL = 'http://localhost:4000/';
let previousOrdersState = {};

const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-3.mp3');

const locationMap = {
  "PENDING": "Gudang",
  "PROCESSING": "Sorting",
  "SHIPPED": "Perjalanan",
  "DELIVERED": "Sampai"
};

async function fetchGraphQL(query, variables = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({query, variables})
  });
  return res.json();
}

/* TOAST */
function showToast(id, status, area) {
  audio.play();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `Order #${id} → ${area}`;

  document.getElementById('toastContainer').appendChild(toast);

  setTimeout(()=>toast.remove(),3000);
}

/* LOAD PRODUK */
async function loadProducts() {
  const query = `query { products { id name price stock } }`;
  const res = await fetchGraphQL(query);

  const grid = document.getElementById('productGrid');
  grid.innerHTML = '';

  res.data.products.forEach(p=>{
    grid.innerHTML += `
      <div class="product-card">
        <div class="discount">-20%</div>
        <div class="product-image">📦</div>
        <div>${p.name}</div>
        <div class="product-price">Rp ${p.price}</div>
        <div class="rating">⭐ 4.8 | 1k+</div>
        <button onclick="buy(${p.id})">Beli</button>
      </div>
    `;
  });
}

/* BUY */
async function buy(id){
  const name = prompt("Nama:");
  if(!name) return;

  const mutation = `
    mutation($input:CreateOrderInput!){
      createOrder(input:$input){id status}
    }
  `;

  const res = await fetchGraphQL(mutation,{
    input:{customerName:name,items:[{productId:id,quantity:1}]}
  });

  loadOrders();
}

/* TRACKING */
async function loadOrders(){
  const query = `query{orders{id status}}`;
  const res = await fetchGraphQL(query);

  let html='';

  res.data.orders.forEach(o=>{
    const area = locationMap[o.status];

    if(previousOrdersState[o.id] && previousOrdersState[o.id] !== o.status){
      showToast(o.id,o.status,area);
    }

    previousOrdersState[o.id]=o.status;

    html += `
      <div>
        <b>Order #${o.id}</b>
        <div class="timeline">
          <div class="step ${o.status==='PENDING'?'active':''}">Pesan</div>
          <div class="step ${o.status==='PROCESSING'?'active':''}">Proses</div>
          <div class="step ${o.status==='SHIPPED'?'active':''}">Kirim</div>
          <div class="step ${o.status==='DELIVERED'?'active':''}">Sampai</div>
        </div>
        <small>${area}</small>
      </div>
    `;
  });

  document.getElementById('trackingList').innerHTML = html;
}

/* INIT */
loadProducts();
loadOrders();
setInterval(loadOrders,3000);