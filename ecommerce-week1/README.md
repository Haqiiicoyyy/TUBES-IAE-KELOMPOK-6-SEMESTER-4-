# 🛒 E-Commerce GraphQL API

Aplikasi e-commerce terintegrasi menggunakan **GraphQL (Apollo Server)**, **MySQL**, dan **Docker**.

---

## 📁 Struktur Folder

```
ecommerce-app/
├── backend/
│   ├── schema/
│   │   └── typeDefs.js        ← GraphQL Schema (modular)
│   ├── resolvers/
│   │   ├── index.js           ← Merge semua resolver
│   │   ├── productResolver.js ← Resolver Product
│   │   ├── categoryResolver.js← Resolver Category
│   │   └── orderResolver.js   ← Resolver Order
│   ├── db.js                  ← Koneksi MySQL (connection pool)
│   ├── index.js               ← Entry point Apollo Server
│   ├── init.sql               ← Inisialisasi database & seed data
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
└── client/
    └── index.html             ← (Week 3)
```

---

## ⚙️ Tech Stack

| Layer    | Teknologi               |
|----------|-------------------------|
| Backend  | Node.js + Apollo Server |
| API      | GraphQL                 |
| Database | MySQL 8                 |
| Container| Docker + Docker Compose |

---

## 🚀 Cara Menjalankan (Week 3+)

```bash
# Clone project
git clone <repo-url>
cd ecommerce-app

# Jalankan semua service
docker-compose up --build
```

> GraphQL Playground tersedia di: `http://localhost:4000`

---

## 📐 GraphQL Schema

### Query
| Nama        | Deskripsi                    |
|-------------|------------------------------|
| `products`  | Ambil semua produk           |
| `product`   | Ambil produk berdasarkan ID  |
| `categories`| Ambil semua kategori         |
| `orders`    | Ambil semua pesanan          |

### Mutation
| Nama                | Deskripsi                        |
|---------------------|----------------------------------|
| `createProduct`     | Tambah produk baru               |
| `updateProduct`     | Update data produk               |
| `deleteProduct`     | Hapus produk                     |
| `createCategory`    | Tambah kategori baru             |
| `createOrder`       | Buat pesanan baru (transaksi)    |
| `updateOrderStatus` | Update status pesanan            |

---

## 🗓️ Progress

- [x] **Week 1** – Setup schema, resolver, Dockerfile
- [ ] **Week 2** – Koneksi DB, testing query/mutation
- [ ] **Week 3** – Docker Compose, client HTML
- [ ] **Week 4** – Finalisasi & dokumentasi
