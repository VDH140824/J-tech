package com.jtech.service;

import com.cloudinary.Cloudinary;
import java.util.*;
import java.security.Principal;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class RewardAdminService {
    public record Item(String itemType,String name,String description,Long coinPrice,String status) {}
    public record Rule(String activityType,Long coinAmount,boolean enabled) {}
    public static final List<String> ACTIVITIES=List.of("EXERCISE","LESSON_TEST","CHAPTER_TEST","LISTENING","READING","CONJUGATION","GAME");
    private final JdbcTemplate db; private final FeedbackService access; private final Cloudinary cloud;
    public RewardAdminService(JdbcTemplate db,FeedbackService access,Cloudinary cloud){this.db=db;this.access=access;this.cloud=cloud;}
    public List<Map<String,Object>> items(Principal p){access.actor(p,"ADMIN");return db.queryForList("SELECT s.*, (SELECT COUNT(*) FROM user_inventory i WHERE i.store_item_id=s.id) AS redeemedCount FROM store_item s ORDER BY s.created_at DESC,s.id DESC");}
    @Transactional
    public void saveItem(Principal p,Long id,Item item,MultipartFile image) throws java.io.IOException {
        long actor=access.actor(p,"ADMIN").getUserId();
        if (item == null) throw new IllegalArgumentException("Thiếu dữ liệu vật phẩm.");
        if (!Set.of("BADGE", "AVATAR_FRAME", "AVATAR", "THEME").contains(Objects.toString(item.itemType(), "")))
            throw new IllegalArgumentException("Loại vật phẩm không hợp lệ.");
        if (item.name() == null || item.name().isBlank() || item.name().trim().length() > 100)
            throw new IllegalArgumentException("Tên vật phẩm phải có từ 1 đến 100 ký tự.");
        if (item.description() == null || item.description().isBlank() || item.description().trim().length() > 500)
            throw new IllegalArgumentException("Mô tả phải có từ 1 đến 500 ký tự.");
        if (item.coinPrice() == null || item.coinPrice() < 0 || item.coinPrice() > 4294967295L)
            throw new IllegalArgumentException("Giá xu phải là số nguyên từ 0 đến 4.294.967.295.");
        if (!Set.of("ACTIVE", "INACTIVE").contains(Objects.toString(item.status(), "")))
            throw new IllegalArgumentException("Trạng thái vật phẩm không hợp lệ.");
        Map<String,Object> old=null;
        if(id!=null){var rows=db.queryForList("SELECT * FROM store_item WHERE id=? FOR UPDATE",id);if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy vật phẩm.");old=rows.getFirst();
            if(!Objects.equals(old.get("item_type"),item.itemType()) && db.queryForObject("SELECT COUNT(*) FROM user_inventory WHERE store_item_id=?",Long.class,id)>0)throw new IllegalArgumentException("Không thể đổi loại vật phẩm đã có người sở hữu.");}
        String url=old==null?null:Objects.toString(old.get("image_url"),null),publicId=old==null?null:Objects.toString(old.get("image_public_id"),null);
        if(image!=null && !image.isEmpty()){
            if(image.getSize()>3*1024*1024 || !Set.of("image/jpeg","image/png","image/webp").contains(Objects.toString(image.getContentType(),"")))throw new IllegalArgumentException("Ảnh phải là JPG, PNG, WEBP và không quá 3MB.");
            var upload=cloud.uploader().upload(image.getBytes(),Map.of("folder","jtech/store","resource_type","image","allowed_formats",List.of("jpg","png","webp")));
            url=Objects.toString(upload.get("secure_url"),null); publicId=Objects.toString(upload.get("public_id"),null);
            final String uploaded=publicId;
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){@Override public void afterCompletion(int status){if(status!=STATUS_COMMITTED && uploaded!=null)try{cloud.uploader().destroy(uploaded,Map.of());}catch(Exception ex){org.slf4j.LoggerFactory.getLogger(RewardAdminService.class).warn("Không dọn được ảnh vật phẩm {}",uploaded);}}});
        }
        if(url==null||publicId==null)throw new IllegalArgumentException("Vui lòng chọn ảnh vật phẩm.");
        if(id==null)db.update("INSERT INTO store_item(item_type,name,description,image_url,image_public_id,coin_price,status,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?)",item.itemType(),item.name().trim(),item.description().trim(),url,publicId,item.coinPrice(),item.status(),actor,actor);
        else db.update("UPDATE store_item SET item_type=?,name=?,description=?,image_url=?,image_public_id=?,coin_price=?,status=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",item.itemType(),item.name().trim(),item.description().trim(),url,publicId,item.coinPrice(),item.status(),actor,id);
    }
    @Transactional
    public void deleteItem(Principal p,long id){long actor=access.actor(p,"ADMIN").getUserId();
        if(db.queryForList("SELECT id FROM store_item WHERE id=? FOR UPDATE",id).isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy vật phẩm.");
        if(db.queryForObject("SELECT COUNT(*) FROM user_inventory WHERE store_item_id=?",Long.class,id)>0 || db.queryForObject("SELECT COUNT(*) FROM coin_transaction WHERE source_type='STORE' AND source_ref_id=?",Long.class,id)>0)db.update("UPDATE store_item SET status='INACTIVE',updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",actor,id);
        else db.update("DELETE FROM store_item WHERE id=?",id);
    }
    public List<Map<String,Object>> rules(Principal p){access.actor(p,"ADMIN");return db.queryForList("SELECT activity_type,coin_amount,enabled FROM coin_reward_rule ORDER BY activity_type");}
    @Transactional
    public void saveRules(Principal p,List<Rule> rules){access.actor(p,"ADMIN");
        if(rules==null||rules.isEmpty())throw new IllegalArgumentException("Chưa có quy tắc để lưu.");
        Set<String> seen=new HashSet<>();
        for(var r:rules){if(r==null||!ACTIVITIES.contains(r.activityType())||!seen.add(r.activityType())||r.coinAmount()==null||r.coinAmount()<=0||r.coinAmount()>4294967295L)throw new IllegalArgumentException("Số xu thưởng phải là số nguyên dương lớn hơn 0.");}
        for(var r:rules)db.update("INSERT INTO coin_reward_rule(activity_type,coin_amount,enabled) VALUES(?,?,?) ON DUPLICATE KEY UPDATE coin_amount=VALUES(coin_amount),enabled=VALUES(enabled),updated_at=CURRENT_TIMESTAMP",r.activityType(),r.coinAmount(),r.enabled());
    }
}
