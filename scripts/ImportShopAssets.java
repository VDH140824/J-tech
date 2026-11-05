import java.nio.file.*;
import java.sql.*;
import java.util.*;

/** Imports uploaded assets without changing prices or records on subsequent runs. */
public class ImportShopAssets {
    public static void main(String[] args) throws Exception {
        if (args.length != 2 || !Set.of("BADGE", "AVATAR").contains(args[1]))
            throw new IllegalArgumentException("Usage: ImportShopAssets <manifest.tsv> <GIF type: BADGE|AVATAR>");
        String yaml = Files.readString(Path.of("backend/src/main/resources/application.yml"));
        List<String[]> rows = Files.readAllLines(Path.of(args[0])).stream().skip(1)
            .filter(s -> !s.isBlank()).map(s -> s.split("\t", -1)).toList();
        if (rows.size() != 19) throw new IllegalStateException("Expected 19 uploaded assets");
        for (String[] row : rows) if (row.length != 3 || !row[1].startsWith("https://res.cloudinary.com/"))
            throw new IllegalStateException("Invalid manifest");
        String url = UploadShopAssets.value(yaml, "url");
        url += (url.contains("?") ? "&" : "?") + "connectTimeout=5000&socketTimeout=15000";
        try (Connection db = DriverManager.getConnection(url, UploadShopAssets.value(yaml,"username"), UploadShopAssets.value(yaml,"password"))) {
            if (args[1].equals("AVATAR")) {
                String type;
                try (var p = db.prepareStatement("SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='store_item' AND COLUMN_NAME='item_type'"); var r = p.executeQuery()) {
                    if (!r.next()) throw new IllegalStateException("Missing store_item");
                    type = r.getString(1);
                }
                if (!type.contains("'AVATAR'")) {
                    if (!type.equals("enum('BADGE','AVATAR_FRAME','THEME')")) throw new IllegalStateException("Unexpected item types; refusing schema change");
                    try (var s = db.createStatement()) {
                        s.executeUpdate("ALTER TABLE store_item MODIFY COLUMN item_type ENUM('BADGE','AVATAR_FRAME','THEME','AVATAR') NOT NULL");
                    }
                }
            }
            db.setAutoCommit(false);
            try {
                int inserted = 0, skipped = 0, badge = 0, avatar = 0;
                for (String[] row : rows) {
                    boolean gif = row[0].toLowerCase(Locale.ROOT).endsWith(".gif");
                    String type = gif ? args[1] : "BADGE";
                    int index = type.equals("AVATAR") ? ++avatar : ++badge;
                    try (var p = db.prepareStatement("SELECT id FROM store_item WHERE image_public_id=?")) {
                        p.setString(1, row[2]);
                        try (var r = p.executeQuery()) { if (r.next()) { skipped++; continue; } }
                    }
                    try (var p = db.prepareStatement("INSERT INTO store_item(item_type,name,description,image_url,image_public_id,coin_price,status) VALUES(?,?,?,?,?,100,'ACTIVE')")) {
                        p.setString(1,type);
                        p.setString(2, (type.equals("AVATAR") ? "Avatar động " : "Huy hiệu ") + String.format("%02d", index));
                        p.setString(3,"Vật phẩm đổi xu. File gốc: " + row[0]);
                        p.setString(4,row[1]); p.setString(5,row[2]);
                        inserted += p.executeUpdate();
                    }
                }
                db.commit();
                System.out.println("COMMITTED inserted=" + inserted + " skipped=" + skipped);
                try (var p = db.prepareStatement("SELECT id,item_type,name,coin_price,status,image_url FROM store_item WHERE image_public_id=?")) {
                    for (String[] row : rows) {
                        p.setString(1,row[2]);
                        try (var r = p.executeQuery()) {
                            if (!r.next()) throw new IllegalStateException("Verification failed");
                            if (!row[1].equals(r.getString(6))) throw new IllegalStateException("Stored URL differs from upload manifest");
                            if (r.getString(3).contains("?")) throw new IllegalStateException("Item name encoding verification failed");
                            System.out.println(r.getLong(1)+" | "+r.getString(2)+" | "+r.getString(3)+" | "+r.getInt(4)+" | "+r.getString(5));
                        }
                    }
                }
            } catch (Exception e) { db.rollback(); throw e; }
        }
    }
}
