-- 全站内容作为一个有版本的文档保存，日后可按项目、文章拆表而不改前端契约。
CREATE TABLE content_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  draft TEXT NOT NULL,
  published TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  published_revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  published_at TEXT NOT NULL
);
CREATE TABLE content_history (
  revision INTEGER PRIMARY KEY,
  document TEXT NOT NULL,
  created_at TEXT NOT NULL
);
-- 每次发布都保留快照，只保留最近 20 次，便于恢复误操作。
CREATE TRIGGER remember_publication AFTER UPDATE OF published_revision ON content_state
WHEN NEW.published_revision != OLD.published_revision
BEGIN
  INSERT INTO content_history VALUES (NEW.published_revision, NEW.published, NEW.published_at);
  DELETE FROM content_history WHERE revision NOT IN (SELECT revision FROM content_history ORDER BY revision DESC LIMIT 20);
END;
CREATE TABLE admin_auth (id INTEGER PRIMARY KEY CHECK (id = 1), password_hash TEXT NOT NULL);
CREATE TABLE admin_sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
CREATE TABLE login_attempts (ip_hash TEXT PRIMARY KEY, attempts INTEGER NOT NULL, window_start INTEGER NOT NULL);
-- 小型头像和封面。仅允许后台上传的栅格图片，单张最多 512 KB。
CREATE TABLE media (id TEXT PRIMARY KEY, mime TEXT NOT NULL, data BLOB NOT NULL, created_at TEXT NOT NULL);
