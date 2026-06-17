-- ─── CREATE DATABASE ───────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS ecommerce_db;
USE ecommerce_db;

-- ─── CATEGORIES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── PRODUCTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  price DECIMAL(12, 2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  category_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- ─── ORDERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(150) NOT NULL,
  shipping_address TEXT NOT NULL,
  total_price DECIMAL(14, 2) NOT NULL,
  status ENUM('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED') DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── ORDER ITEMS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT,
  quantity INT NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- ─── SEED DATA ─────────────────────────────────────────────────
INSERT INTO categories (name) VALUES
  ('Electronics'),
  ('Fashion'),
  ('Books'),
  ('Food & Beverage');

INSERT INTO products (name, description, price, stock, category_id) VALUES
  ('Laptop Gaming ASUS ROG', 'Laptop gaming performa tinggi dengan RTX 4060', 18500000, 15, 1),
  ('iPhone 15 Pro', 'Smartphone flagship Apple terbaru', 21000000, 10, 1),
  ('Kaos Polos Premium', 'Kaos cotton combed 30s berbagai warna', 85000, 200, 2),
  ('Buku Clean Code', 'Panduan menulis kode yang bersih dan maintainable', 150000, 50, 3),
  ('Kopi Arabica Flores', 'Single origin kopi arabica dari Flores, 250gr', 75000, 100, 4);
