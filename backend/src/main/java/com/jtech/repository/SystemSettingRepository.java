package com.jtech.repository;

import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;

@Repository
public class SystemSettingRepository {
    private static final String KEY = "system.runtime";
    private final JdbcTemplate db;

    public SystemSettingRepository(JdbcTemplate db) { this.db = db; }

    public record StoredSettings(String value, boolean secret, Long updatedBy,
        String updatedByName, LocalDateTime updatedAt) {}

    public Optional<StoredSettings> find() {
        return db.query("""
            SELECT CASE WHEN s.is_secret=FALSE THEN s.setting_value ELSE NULL END AS value,
                   s.is_secret,s.updated_by,COALESCE(u.full_name,u.email) AS updater,s.updated_at
            FROM system_setting s LEFT JOIN user_account u ON u.id=s.updated_by
            WHERE s.setting_key=?
            """, (row, index) -> new StoredSettings(row.getString("value"),row.getBoolean("is_secret"),
                row.getObject("updated_by",Long.class),row.getString("updater"),
                row.getTimestamp("updated_at")==null ? null : row.getTimestamp("updated_at").toLocalDateTime()),KEY)
            .stream().findFirst();
    }

    public void save(String value, long actorId) {
        // Never replace a pre-existing secret setting, including during concurrent requests.
        db.update("""
            INSERT INTO system_setting(setting_key,setting_value,is_secret,description,updated_by,updated_at)
            VALUES (?,?,FALSE,'Cấu hình thông báo và email hệ thống',?,CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
                setting_value=IF(is_secret=FALSE,VALUES(setting_value),setting_value),
                updated_by=IF(is_secret=FALSE,VALUES(updated_by),updated_by),
                updated_at=IF(is_secret=FALSE,CURRENT_TIMESTAMP,updated_at)
            """,KEY,value,actorId);
        if (find().map(StoredSettings::secret).orElse(false)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Khóa cấu hình đang được sử dụng cho dữ liệu bí mật.");
        }
    }
}
