package com.jtech.controller;

import com.jtech.service.FeedbackService;
import java.security.Principal;
import java.util.*;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/admin/rewards/milestones")
public class StreakMilestoneAdminController {
    public record MilestoneRequest(Integer targetDays, Long coinAmount, boolean enabled) {}
    private final FeedbackService access;
    private final JdbcTemplate db;
    public StreakMilestoneAdminController(FeedbackService access, JdbcTemplate db) { this.access=access; this.db=db; }
    @GetMapping
    public List<Map<String,Object>> list(Principal p) {
        access.actor(p,"ADMIN");
        return db.queryForList("SELECT m.id,m.target_days AS targetDays,m.coin_amount AS coinAmount,m.enabled," +
            "(SELECT COUNT(*) FROM coin_transaction t WHERE t.source_type='STREAK' AND t.source_ref_id=m.id) AS awardedCount " +
            "FROM streak_milestone m ORDER BY m.target_days");
    }
    @PostMapping
    @Transactional
    public void create(Principal p,@RequestBody MilestoneRequest r) {
        access.actor(p,"ADMIN"); validate(r);
        try { db.update("INSERT INTO streak_milestone(target_days,coin_amount,enabled) VALUES (?,?,?)",r.targetDays(),r.coinAmount(),r.enabled()); }
        catch (DuplicateKeyException e) { throw new ResponseStatusException(HttpStatus.CONFLICT,"Mốc ngày này đã tồn tại trong hệ thống."); }
    }
    @PutMapping("/{id}")
    @Transactional
    public void update(Principal p,@PathVariable long id,@RequestBody MilestoneRequest r) {
        access.actor(p,"ADMIN"); validate(r);
        var rows=db.queryForList("SELECT target_days FROM streak_milestone WHERE id=? FOR UPDATE",id);
        if(rows.isEmpty()) throw missing();
        if(((Number)rows.getFirst().get("target_days")).intValue()!=r.targetDays())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Chỉ được thay đổi số xu và trạng thái của mốc hiện có.");
        db.update("UPDATE streak_milestone SET coin_amount=?,enabled=? WHERE id=?",r.coinAmount(),r.enabled(),id);
    }
    @DeleteMapping("/{id}")
    @Transactional
    public void delete(Principal p,@PathVariable long id) {
        access.actor(p,"ADMIN");
        // Lock with the same order as awarding: milestone reads below take a shared lock.
        if(db.queryForList("SELECT id FROM streak_milestone WHERE id=? FOR UPDATE",id).isEmpty()) throw missing();
        long count=db.queryForObject("SELECT COUNT(*) FROM coin_transaction WHERE source_type='STREAK' AND source_ref_id=?",Long.class,id);
        if(count>0) db.update("UPDATE streak_milestone SET enabled=FALSE WHERE id=?",id);
        else db.update("DELETE FROM streak_milestone WHERE id=?",id);
    }
    private void validate(MilestoneRequest r) {
        if(r.targetDays()==null||r.targetDays()<=0||r.coinAmount()==null||r.coinAmount()<=0||r.coinAmount()>4294967295L)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Mốc ngày và số xu phải là số nguyên dương hợp lệ.");
    }
    private ResponseStatusException missing(){return new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy mốc chuỗi học tập.");}
}
