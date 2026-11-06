package com.jtech.controller;

import com.jtech.service.FeedbackService;
import java.security.Principal;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/coins")
public class CoinWalletController {
    private final JdbcTemplate db;
    private final FeedbackService access;
    public CoinWalletController(JdbcTemplate db, FeedbackService access) { this.db=db; this.access=access; }

    @GetMapping
    public Map<String,Object> history(Principal principal,
        @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="10") int size) {
        long user = access.actor(principal,"STUDENT").getUserId();
        if(page<0 || size<1 || size>100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Trang không hợp lệ.");
        var rows=db.queryForList("SELECT id,direction,amount,balance_after,source_type,source_ref_id,description,created_at FROM coin_transaction WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?",user,size,(long)page*size);
        return Map.of("balance",db.queryForObject("SELECT coin_balance FROM user_account WHERE id=?",Long.class,user),
            "content",rows,"totalElements",db.queryForObject("SELECT COUNT(*) FROM coin_transaction WHERE user_id=?",Long.class,user),"page",page,"size",size);
    }
    @GetMapping("/{id}")
    public Map<String,Object> detail(Principal principal,@PathVariable long id) {
        long user=access.actor(principal,"STUDENT").getUserId();
        var rows=db.queryForList("SELECT id,direction,amount,balance_after,source_type,source_ref_id,description,created_at FROM coin_transaction WHERE id=? AND user_id=?",id,user);
        if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy giao dịch.");
        return rows.getFirst();
    }
}
