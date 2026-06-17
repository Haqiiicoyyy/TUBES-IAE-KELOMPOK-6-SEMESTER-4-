# TokoGraphQL — E-Commerce GraphQL API

Aplikasi e-commerce terintegrasi end-to-end menggunakan **GraphQL API** (Apollo Server), **MySQL**, dan **Docker**. Dibangun sebagai Tugas Besar mata kuliah Enterprise Application Integration (EAI).

---

## Daftar Isi

- [Arsitektur Sistem](#arsitektur-sistem)
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Struktur Direktori](#struktur-direktori)
- [ERD & GraphQL Schema](#erd--graphql-schema)
- [Instalasi & Menjalankan Aplikasi](#instalasi--menjalankan-aplikasi)
- [GraphQL API — Query & Mutation](#graphql-api--query--mutation)
- [Fitur Frontend (Client HTML)](#fitur-frontend-client-html)
- [Anggota Kelompok](#anggota-kelompok)

---

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                     Host Machine                        │
│                                                         │
│  ┌──────────────┐        ┌────────────────────────────┐ │
│  │   Frontend   │        │   Docker Network (internal)│ │
│  │  index.html  │        │                            │ │
│  │  script.js   │──POST──▶  [backend:4000]            │ │
│  │  style.css   │  :4000 │  Apollo Server (GraphQL)   │ │
│  └──────────────┘        │         │                  │ │
│                          │         ▼                  │ │
│                          │  [db:3306] ← port 3307     │ │
│                          │  MySQL 8.0                 │ │
│                          │  ecommerce_db              │ │
│                          └────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

Alur data:

1. Browser membuka `index.html` dan menjalankan `script.js`
2. `script.js` mengirim request `POST` ke `http://localhost:4000/` dengan query GraphQL
3. Apollo Server menerima request, mencocokkan dengan schema, dan memanggil resolver yang sesuai
4. Resolver mengeksekusi query SQL ke MySQL melalui `db.js` (connection pool)
5. Data dikembalikan ke browser dalam format JSON

---

## Teknologi yang Digunakan

| Layer | Teknologi | Versi |
|---|---|---|
| Runtime | Node.js | 20 (Alpine) |
| GraphQL Server | Apollo Server | ^4.10.0 |
| GraphQL | graphql + graphql-tag | ^16.8.1 |
| Database | MySQL | 8.0 |
| DB Driver | mysql2 | ^3.9.1 |
| Environment | dotenv | ^16.4.5 |
| Container | Docker + Docker Compose | — |
| Frontend | HTML + CSS + Vanilla JS | — |

---

## Struktur Direktori

```
.
├── tubes-compose.yml          # Docker Compose konfigurasi
│
├── backend/
│   ├── Dockerfile             # Multi-stage build (Node 20 Alpine)
│   ├── package.json
│   ├── index.js               # Entry point — Apollo Server
│   ├── db.js                  # MySQL connection pool
│   ├── init.sql               # DDL + seed data database
│   │
│   ├── schema/
│   │   └── typeDefs.js        # GraphQL schema (type, query, mutation)
│   │
│   └── resolvers/
│       ├── index.js           # Menggabungkan semua resolver
│       ├── productResolver.js # CRUD produk
│       ├── categoryResolver.js# Query & create kategori
│       └── orderResolver.js   # Create order + update status
│
└── client/
    ├── index.html             # Halaman utama marketplace
    ├── style.css              # Styling
    └── script.js             # GraphQL client + logika UI
```

---

## ERD & GraphQL Schema

### Entity Relationship Diagram

```
┌─────────────────┐        ┌─────────────────┐
│   categories    │        │    products     │
├─────────────────┤        ├─────────────────┤
│ id (PK)         │◀───────│ id (PK)         │
│ name            │  1:N   │ name            │
│ created_at      │        │ description     │
└─────────────────┘        │ price           │
                           │ stock           │
                           │ category_id (FK)│
                           │ created_at      │
                           └────────┬────────┘
                                    │ 1:N
                           ┌────────▼────────┐
                           │   order_items   │
                           ├─────────────────┤
        ┌──────────────────│ id (PK)         │
        │                  │ order_id (FK)   │
        │                  │ product_id (FK) │
        │                  │ quantity        │
        │                  │ subtotal        │
        │                  └─────────────────┘
        │ 1:N
┌───────▼─────────┐
│     orders      │
├─────────────────┤
│ id (PK)         │
│ customer_name   │
│ shipping_address│
│ total_price     │
│ status (ENUM)   │
│ created_at      │
└─────────────────┘
```

Status order: `PENDING` → `PROCESSING` → `SHIPPED` → `DELIVERED` / `CANCELLED`

### GraphQL Schema Ringkas

```graphql
type Query {
  products: [Product]
  product(id: ID!): Product
  categories: [Category]
  orders: [Order]
}

type Mutation {
  # Product
  createProduct(input: CreateProductInput!): Product
  updateProduct(id: ID!, input: UpdateProductInput!): Product
  deleteProduct(id: ID!): Boolean

  # Category
  createCategory(input: CreateCategoryInput!): Category

  # Order
  createOrder(input: CreateOrderInput!): Order
  updateOrderStatus(id: ID!, status: String!): Order
}
```

---

## Instalasi & Menjalankan Aplikasi

### Prasyarat

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) sudah terinstall dan berjalan

### Langkah-langkah

**1. Clone / unduh repository ini**

```bash
git clone <url-repository>
cd <nama-folder>
```

**2. Jalankan seluruh service dengan Docker Compose**

```bash
docker-compose -f tubes-compose.yml up --build
```

Docker akan:
- Membangun image backend dari `Dockerfile` (multi-stage, Node 20 Alpine)
- Menjalankan container MySQL dan menginisialisasi database dari `init.sql` (termasuk seed data)
- Menunggu MySQL sehat (`healthcheck`) sebelum menjalankan backend
- Membuka port `4000` untuk GraphQL API dan `3307` untuk akses langsung ke MySQL

**3. Buka frontend**

Buka file `client/index.html` langsung di browser, atau serve dengan:

```bash
# Contoh menggunakan Python (opsional)
cd client
python3 -m http.server 8080
# Lalu buka http://localhost:8080
```

**4. Akses GraphQL Playground / Sandbox**

Buka browser dan arahkan ke:

```
http://localhost:4000/
```

**5. Menghentikan aplikasi**

```bash
docker-compose -f tubes-compose.yml down
```

Untuk menghapus data MySQL juga (volume):

```bash
docker-compose -f tubes-compose.yml down -v
```

---

## GraphQL API — Query & Mutation

Semua request dikirim ke endpoint: `POST http://localhost:4000/`

### Query

**Mengambil semua produk**

```graphql
query {
  products {
    id
    name
    price
    stock
    category {
      name
    }
  }
}
```

**Mengambil satu produk**

```graphql
query {
  product(id: "1") {
    id
    name
    description
    price
    stock
  }
}
```

**Mengambil semua kategori**

```graphql
query {
  categories {
    id
    name
  }
}
```

**Mengambil semua order**

```graphql
query {
  orders {
    id
    customerName
    shippingAddress
    totalPrice
    status
    items {
      quantity
      subtotal
      product {
        name
      }
    }
  }
}
```

---

### Mutation

**Menambah produk baru**

```graphql
mutation {
  createProduct(input: {
    name: "Sepatu Sneakers"
    description: "Sneakers kasual nyaman dipakai"
    price: 350000
    stock: 50
    categoryId: "2"
  }) {
    id
    name
  }
}
```

**Mengupdate stok produk**

```graphql
mutation {
  updateProduct(id: "1", input: {
    stock: 20
  }) {
    id
    name
    stock
  }
}
```

**Menghapus produk**

```graphql
mutation {
  deleteProduct(id: "1")
}
```

**Membuat kategori baru**

```graphql
mutation {
  createCategory(input: {
    name: "Olahraga"
  }) {
    id
    name
  }
}
```

**Membuat pesanan baru**

```graphql
mutation {
  createOrder(input: {
    customerName: "Budi Santoso"
    shippingAddress: "Jl. Sudirman No. 12, Jakarta"
    items: [
      { productId: "1", quantity: 1 }
    ]
  }) {
    id
    status
    totalPrice
  }
}
```

**Mengupdate status order**

```graphql
mutation {
  updateOrderStatus(id: "1", status: "SHIPPED") {
    id
    status
  }
}
```

---

## Fitur Frontend (Client HTML)

| Fitur | Deskripsi |
|---|---|
| Tampilan produk | Grid produk dengan info nama, harga, stok, dan kategori |
| Indikator stok | Badge "Stok Menipis" otomatis muncul jika stok < 5 |
| Modal checkout | Form pengisian nama penerima dan alamat pengiriman |
| Live tracking | Daftar order dengan timeline status, auto-refresh tiap 3 detik |
| Update status | Dropdown langsung di tracking untuk mengubah status order |
| Toast notification | Pop-up muncul otomatis saat status order berubah |
| Seller Center | Form tambah produk baru (Create) |
| Tabel admin | Daftar semua produk dengan tombol Edit Stok dan Hapus |

---

## Anggota Kelompok

| Nama | NIM | Peran |
|---|---|---|
| — | — | — |
| — | — | — |
| — | — | — |
| — | — | — |

---

> Tugas Besar — Enterprise Application Integration (EAI) | Semester Genap 2025/2026
