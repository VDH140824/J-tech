package com.jtech.controller;

import com.jtech.service.StoreService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.security.Principal;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
public class StoreController {

    private final StoreService store;

    public StoreController(StoreService store) {
        this.store = store;
    }

    public record Redemption(
        @Min(0) int expectedPrice,
        @NotNull @Pattern(regexp = "[a-zA-Z0-9-]{1,64}") String requestId
    ) {}

    public record Equipment(boolean equipped) {}

    @GetMapping("/store")
    public Map<String, Object> catalog(Principal p) {
        return store.catalog(store.requireStudent(p));
    }

    @GetMapping("/store/{id}")
    public Map<String, Object> detail(Principal p, @PathVariable long id) {
        return store.detail(store.requireStudent(p), id);
    }

    @PostMapping("/store/{id}/redeem")
    public Map<String, Object> redeem(
        Principal p,
        @PathVariable long id,
        @Valid @RequestBody Redemption r
    ) {
        return store.redeem(store.requireStudent(p), id, r.expectedPrice(), r.requestId());
    }

    @GetMapping("/inventory")
    public List<Map<String, Object>> inventory(Principal p) {
        return store.inventory(store.requireStudent(p));
    }

    @GetMapping("/inventory/{id}/material")
    public Map<String, Object> material(Principal p, @PathVariable long id) {
        return store.material(store.requireStudent(p), id);
    }

    @PutMapping("/inventory/{id}/equipment")
    public List<Map<String, Object>> equip(
        Principal p,
        @PathVariable long id,
        @RequestBody Equipment r
    ) {
        return store.equipment(store.requireStudent(p), id, r.equipped());
    }
}
