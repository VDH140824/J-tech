package com.jtech.controller;
import com.jtech.service.RewardAdminService;
import java.util.*;
import java.security.Principal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
@RestController
@RequestMapping("/admin/rewards")
public class RewardAdminController {
 private final RewardAdminService service;
 public RewardAdminController(RewardAdminService service){this.service=service;}
 @GetMapping("/items") public List<Map<String,Object>> items(Principal p){return service.items(p);}
 @PostMapping(value="/items",consumes="multipart/form-data") public void create(Principal p,@RequestPart("item") RewardAdminService.Item item,@RequestPart(value="image",required=false) MultipartFile image)throws java.io.IOException{service.saveItem(p,null,item,image);}
 @PutMapping(value="/items/{id}",consumes="multipart/form-data") public void update(Principal p,@PathVariable long id,@RequestPart("item") RewardAdminService.Item item,@RequestPart(value="image",required=false) MultipartFile image)throws java.io.IOException{service.saveItem(p,id,item,image);}
 @DeleteMapping("/items/{id}") public void delete(Principal p,@PathVariable long id){service.deleteItem(p,id);}
 @GetMapping("/rules") public List<Map<String,Object>> rules(Principal p){return service.rules(p);}
 @PutMapping("/rules") public void saveRules(Principal p,@RequestBody List<RewardAdminService.Rule> rules){service.saveRules(p,rules);}
}
