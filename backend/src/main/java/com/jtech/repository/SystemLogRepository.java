package com.jtech.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.response.SystemLogResponse;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class SystemLogRepository {
    private final JdbcTemplate db;
    private final ObjectMapper json;
    private static final String FROM = " FROM audit_log a LEFT JOIN user_account u ON u.id=a.user_id ";
    private static final String SELECT = "SELECT a.*,u.full_name,u.email";

    public SystemLogRepository(JdbcTemplate db, ObjectMapper json) { this.db=db; this.json=json; }

    public Page<SystemLogResponse> find(String search, String level, String entityType,
        LocalDate from, LocalDate to, Pageable pageable) {
        StringBuilder where = new StringBuilder(" WHERE 1=1");
        List<Object> args = new ArrayList<>();
        if (search != null && !search.isBlank()) {
            where.append(" AND (LOCATE(?,a.action)>0 OR LOCATE(?,u.email)>0 OR LOCATE(?,u.full_name)>0)");
            args.add(search.trim()); args.add(search.trim()); args.add(search.trim());
        }
        if (level != null) { where.append(" AND a.level=?"); args.add(level); }
        if (entityType != null && !entityType.isBlank()) { where.append(" AND a.entity_type=?"); args.add(entityType.trim()); }
        if (from != null) { where.append(" AND a.created_at>=?"); args.add(from.atStartOfDay()); }
        if (to != null) { where.append(" AND a.created_at<?"); args.add(to.plusDays(1).atStartOfDay()); }
        long count = Objects.requireNonNull(db.queryForObject("SELECT COUNT(*)"+FROM+where, Long.class, args.toArray()));
        args.add(pageable.getPageSize()); args.add(pageable.getOffset());
        var rows = db.query(SELECT+FROM+where+" ORDER BY a.created_at DESC,a.id DESC LIMIT ? OFFSET ?", this::map, args.toArray());
        return new PageImpl<>(rows, pageable, count);
    }

    public Optional<SystemLogResponse> findById(long id) {
        return db.query(SELECT+FROM+" WHERE a.id=?", this::map, id).stream().findFirst();
    }

    private SystemLogResponse map(ResultSet r, int row) throws SQLException {
        var detail = json.nullNode();
        String raw = r.getString("detail");
        if (raw != null) {
            try { detail = json.readTree(raw); }
            catch (JsonProcessingException ex) { detail = json.getNodeFactory().textNode(raw); }
        }
        return new SystemLogResponse(r.getLong("id"), r.getObject("user_id",Long.class),
            r.getString("full_name"),r.getString("email"),r.getString("action"),r.getString("entity_type"),
            r.getObject("entity_id",Long.class),r.getString("level"),detail,r.getString("ip_address"),
            r.getString("user_agent"),r.getTimestamp("created_at").toLocalDateTime());
    }

    public void append(Long actorId, String action, String entityType, Long entityId,
        String level, String detail, String ip, String agent) {
        db.update("INSERT INTO audit_log(user_id,action,entity_type,entity_id,level,detail,ip_address,user_agent) VALUES (?,?,?,?,?,?,?,?)",
            actorId,action,entityType,entityId,level,detail,ip,agent);
    }
}
