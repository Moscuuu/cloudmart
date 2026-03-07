-- Seed data for CloudMart Product Service
-- Categories, Products, and Inventory

-- Categories
INSERT INTO categories (id, name, description) VALUES
    (1, 'Computers', 'Laptops, desktops, and computing devices'),
    (2, 'Audio', 'Headphones, speakers, and audio equipment'),
    (3, 'Accessories', 'Cables, cases, chargers, and other accessories'),
    (4, 'Peripherals', 'Keyboards, mice, monitors, and webcams')
ON CONFLICT (name) DO NOTHING;

-- Products
INSERT INTO products (id, name, description, price, sku, status, category_id, image_url, created_at, updated_at) VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'CloudBook Pro 15', 'High-performance laptop with 15.6" Retina display, M3 chip, 16GB RAM, 512GB SSD', 1499.99, 'CM-COMP-001', 'ACTIVE', 1, NULL, NOW(), NOW()),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'CloudBook Air 13', 'Ultralight laptop with 13.3" display, M2 chip, 8GB RAM, 256GB SSD', 999.99, 'CM-COMP-002', 'ACTIVE', 1, NULL, NOW(), NOW()),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'CloudStation Desktop', 'Compact desktop workstation with Intel i7, 32GB RAM, 1TB NVMe SSD', 1299.99, 'CM-COMP-003', 'ACTIVE', 1, NULL, NOW(), NOW()),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'SoundWave Pro Headphones', 'Premium wireless over-ear headphones with active noise cancellation, 40h battery', 349.99, 'CM-AUD-001', 'ACTIVE', 2, NULL, NOW(), NOW()),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'SoundWave Buds', 'True wireless earbuds with ANC, transparency mode, 8h battery per charge', 179.99, 'CM-AUD-002', 'ACTIVE', 2, NULL, NOW(), NOW()),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'CloudSpeaker Mini', 'Portable Bluetooth speaker with 360-degree sound, waterproof IPX7, 12h battery', 89.99, 'CM-AUD-003', 'ACTIVE', 2, NULL, NOW(), NOW()),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567807', 'USB-C Hub Pro', '7-in-1 USB-C hub with HDMI 4K, 3x USB-A, SD card reader, 100W PD passthrough', 69.99, 'CM-ACC-001', 'ACTIVE', 3, NULL, NOW(), NOW()),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567808', 'CloudCase Laptop Sleeve', 'Premium neoprene laptop sleeve for 13-15" laptops with accessory pocket', 39.99, 'CM-ACC-002', 'ACTIVE', 3, NULL, NOW(), NOW()),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567809', 'PowerCharge 65W GaN', 'Compact 65W GaN USB-C charger with dual ports and foldable plug', 44.99, 'CM-ACC-003', 'ACTIVE', 3, NULL, NOW(), NOW()),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567810', 'MechKey Pro Keyboard', 'Wireless mechanical keyboard with hot-swappable switches, RGB backlighting', 149.99, 'CM-PER-001', 'ACTIVE', 4, NULL, NOW(), NOW()),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567811', 'CloudMouse Ergonomic', 'Ergonomic wireless mouse with 4000 DPI sensor, 6 programmable buttons', 79.99, 'CM-PER-002', 'ACTIVE', 4, NULL, NOW(), NOW()),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567812', 'UltraView 27" Monitor', '27" 4K IPS monitor with USB-C input, 99% sRGB, height-adjustable stand', 449.99, 'CM-PER-003', 'ACTIVE', 4, NULL, NOW(), NOW()),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567813', 'CloudCam HD Webcam', '1080p webcam with auto-focus, dual stereo microphones, privacy shutter', 99.99, 'CM-PER-004', 'ACTIVE', 4, NULL, NOW(), NOW()),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567814', 'CloudBook Pro 14', 'Professional laptop with 14" display, M3 Pro chip, 18GB RAM, 512GB SSD', 1799.99, 'CM-COMP-004', 'ACTIVE', 1, NULL, NOW(), NOW())
ON CONFLICT (sku) DO NOTHING;

-- Inventory
INSERT INTO inventory (product_id, quantity, reserved_quantity) VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 50, 0),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 75, 0),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 30, 0),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 100, 0),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 100, 0),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 60, 0),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567807', 80, 0),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567808', 45, 0),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567809', 90, 0),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567810', 55, 0),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567811', 70, 0),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567812', 25, 0),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567813', 85, 0),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567814', 40, 0)
ON CONFLICT (product_id) DO NOTHING;
