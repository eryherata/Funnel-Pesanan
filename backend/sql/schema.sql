CREATE DATABASE IF NOT EXISTS pantauan_pesanan CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pantauan_pesanan;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(120) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  actor_name VARCHAR(120) NOT NULL DEFAULT 'system',
  summary VARCHAR(255) NOT NULL DEFAULT '',
  snapshot_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_entity (entity_type, entity_id),
  KEY idx_audit_created (created_at)
);

CREATE TABLE IF NOT EXISTS funnels (
  id VARCHAR(120) NOT NULL PRIMARY KEY,
  input_date DATE NULL,
  kode_rup VARCHAR(120) NULL,
  nama_pengadaan VARCHAR(255) NULL,
  wilayah VARCHAR(120) NULL,
  kabkota VARCHAR(120) NULL,
  instansi VARCHAR(255) NULL,
  satker VARCHAR(255) NULL,
  sumber_peluang VARCHAR(120) NULL,
  principal VARCHAR(120) NULL,
  pemasok VARCHAR(120) NULL,
  distributor VARCHAR(120) NULL,
  pelaksana VARCHAR(120) NULL,
  pic_omset VARCHAR(120) NULL,
  penggarap VARCHAR(120) NULL,
  estimasi_brutto DECIMAL(18,2) NOT NULL DEFAULT 0,
  estimasi_netto DECIMAL(18,2) NOT NULL DEFAULT 0,
  estimasi_negosiasi DECIMAL(18,2) NOT NULL DEFAULT 0,
  estimasi_margin_pct DECIMAL(9,2) NOT NULL DEFAULT 0,
  estimasi_qty DECIMAL(18,2) NOT NULL DEFAULT 0,
  stage VARCHAR(120) NULL,
  probability DECIMAL(6,2) NOT NULL DEFAULT 0,
  target_closing DATE NULL,
  follow_up_date DATE NULL,
  next_action VARCHAR(255) NULL,
  status VARCHAR(120) NULL,
  priority VARCHAR(120) NULL,
  converted TINYINT(1) NOT NULL DEFAULT 0,
  converted_order_no VARCHAR(120) NULL,
  updated_by VARCHAR(120) NOT NULL DEFAULT 'system',
  last_update_at DATETIME NULL,
  payload_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_funnel_stage (stage),
  KEY idx_funnel_wilayah (wilayah),
  KEY idx_funnel_penggarap (penggarap)
);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(120) NOT NULL PRIMARY KEY,
  po_number VARCHAR(120) NOT NULL,
  po_date DATE NULL,
  kode_rup VARCHAR(120) NULL,
  wilayah VARCHAR(120) NULL,
  kabkota VARCHAR(120) NULL,
  instansi VARCHAR(255) NULL,
  satker VARCHAR(255) NULL,
  nama_pengadaan VARCHAR(255) NULL,
  principal VARCHAR(120) NULL,
  pemasok VARCHAR(120) NULL,
  distributor VARCHAR(120) NULL,
  pelaksana VARCHAR(120) NULL,
  pic VARCHAR(120) NULL,
  penggarap VARCHAR(120) NULL,
  sumber_dana VARCHAR(120) NULL,
  ppn_mode VARCHAR(60) NULL,
  brutto DECIMAL(18,2) NOT NULL DEFAULT 0,
  netto DECIMAL(18,2) NOT NULL DEFAULT 0,
  negosiasi DECIMAL(18,2) NOT NULL DEFAULT 0,
  status_pesanan VARCHAR(120) NULL,
  status_pengiriman VARCHAR(120) NULL,
  sla_status VARCHAR(120) NULL,
  kelengkapan VARCHAR(120) NULL,
  prioritas VARCHAR(120) NULL,
  funnel_id VARCHAR(120) NULL,
  source_funnel_code VARCHAR(120) NULL,
  source_funnel_name VARCHAR(255) NULL,
  updated_by VARCHAR(120) NOT NULL DEFAULT 'system',
  last_update_at DATETIME NULL,
  payload_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_orders_po_number (po_number),
  KEY idx_orders_status (status_pesanan),
  KEY idx_orders_shipping (status_pengiriman),
  KEY idx_orders_funnel (funnel_id),
  KEY idx_orders_wilayah (wilayah)
);

CREATE TABLE IF NOT EXISTS funnel_order_links (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  funnel_id VARCHAR(120) NOT NULL,
  order_id VARCHAR(120) NOT NULL,
  order_no VARCHAR(120) NOT NULL,
  link_type VARCHAR(60) NOT NULL DEFAULT 'link',
  is_primary TINYINT(1) NOT NULL DEFAULT 1,
  linked_by VARCHAR(120) NOT NULL DEFAULT 'system',
  linked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  note VARCHAR(255) NULL,
  UNIQUE KEY uk_funnel_order_link (funnel_id, order_no),
  KEY idx_funnel_order_links_funnel (funnel_id),
  KEY idx_funnel_order_links_order (order_id),
  CONSTRAINT fk_funnel_order_links_funnel FOREIGN KEY (funnel_id) REFERENCES funnels (id) ON DELETE CASCADE,
  CONSTRAINT fk_funnel_order_links_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(120) NOT NULL,
  line_no INT NOT NULL,
  product_code VARCHAR(120) NULL,
  product_name VARCHAR(255) NULL,
  category VARCHAR(120) NULL,
  qty DECIMAL(18,2) NOT NULL DEFAULT 0,
  hpp_total DECIMAL(18,2) NOT NULL DEFAULT 0,
  tayang_total DECIMAL(18,2) NOT NULL DEFAULT 0,
  kontrak_total DECIMAL(18,2) NOT NULL DEFAULT 0,
  nego_total DECIMAL(18,2) NOT NULL DEFAULT 0,
  payload_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  KEY idx_order_items_order (order_id)
);

CREATE TABLE IF NOT EXISTS master_locations (
  id VARCHAR(120) NOT NULL PRIMARY KEY,
  wilayah VARCHAR(120) NOT NULL,
  kabkota VARCHAR(120) NOT NULL,
  instansi VARCHAR(255) NULL,
  satker VARCHAR(255) NULL,
  alias_json JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS master_principals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  principal_code VARCHAR(60) NULL,
  principal_name VARCHAR(120) NOT NULL,
  category VARCHAR(120) NULL,
  alias_json JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_master_principals_code (principal_code)
);

CREATE TABLE IF NOT EXISTS master_owners (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  owner_name VARCHAR(120) NOT NULL,
  owner_role VARCHAR(120) NULL,
  team_name VARCHAR(120) NULL,
  wilayah VARCHAR(120) NULL,
  email VARCHAR(180) NULL,
  phone VARCHAR(60) NULL,
  alias_json JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS master_partners (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  partner_name VARCHAR(180) NOT NULL,
  partner_type VARCHAR(60) NOT NULL,
  principal_name VARCHAR(120) NULL,
  wilayah VARCHAR(120) NULL,
  kabkota VARCHAR(120) NULL,
  contact_name VARCHAR(120) NULL,
  contact_phone VARCHAR(60) NULL,
  alias_json JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_master_partners_type (partner_type),
  KEY idx_master_partners_principal (principal_name)
);


CREATE TABLE IF NOT EXISTS order_drafts (
  id VARCHAR(120) NOT NULL PRIMARY KEY,
  draft_code VARCHAR(120) NULL,
  po_number VARCHAR(120) NULL,
  satker VARCHAR(255) NULL,
  nama_pengadaan VARCHAR(255) NULL,
  principal VARCHAR(120) NULL,
  entry_stage VARCHAR(60) NULL,
  status_target VARCHAR(120) NULL,
  source_funnel_id VARCHAR(120) NULL,
  updated_by VARCHAR(120) NOT NULL DEFAULT 'system',
  last_saved_at DATETIME NULL,
  payload_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_order_drafts_stage (entry_stage),
  KEY idx_order_drafts_saved (last_saved_at)
);


CREATE TABLE IF NOT EXISTS order_issues (
  id VARCHAR(120) NOT NULL PRIMARY KEY,
  order_id VARCHAR(120) NULL,
  order_no VARCHAR(120) NOT NULL,
  issue_type VARCHAR(50) NOT NULL DEFAULT 'Exception',
  severity VARCHAR(50) NOT NULL DEFAULT 'Sedang',
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  owner_name VARCHAR(120) NULL,
  due_date DATE NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Open',
  resolved_at DATETIME NULL,
  snapshot_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_order_issues_order (order_no),
  KEY idx_order_issues_status (status),
  KEY idx_order_issues_due (due_date)
);


CREATE TABLE IF NOT EXISTS saved_views (
  id VARCHAR(120) NOT NULL PRIMARY KEY,
  page_key VARCHAR(120) NOT NULL,
  name VARCHAR(160) NOT NULL,
  note TEXT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  filter_state_json JSON NOT NULL,
  updated_by VARCHAR(120) NOT NULL DEFAULT 'system',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_saved_views_page (page_key),
  KEY idx_saved_views_default (page_key, is_default)
);


CREATE TABLE IF NOT EXISTS app_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  role_name VARCHAR(30) NOT NULL DEFAULT 'viewer',
  password_hash CHAR(64) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_app_users_username (username)
);

CREATE TABLE IF NOT EXISTS app_sessions (
  token CHAR(64) NOT NULL PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  last_seen_at DATETIME NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_app_sessions_user (user_id),
  KEY idx_app_sessions_expires (expires_at),
  CONSTRAINT fk_app_sessions_user FOREIGN KEY (user_id) REFERENCES app_users (id) ON DELETE CASCADE
);

INSERT INTO app_users (username, display_name, role_name, password_hash, is_active)
VALUES
  ('admin', 'Administrator Sistem', 'admin', SHA2('admin123', 256), 1),
  ('opslead', 'OPS Lead', 'editor', SHA2('ops12345', 256), 1),
  ('viewer', 'Viewer Dashboard', 'viewer', SHA2('viewer123', 256), 1)
ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  role_name = VALUES(role_name),
  password_hash = VALUES(password_hash),
  is_active = VALUES(is_active);

