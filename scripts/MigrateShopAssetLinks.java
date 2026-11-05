import java.nio.file.*;
import java.sql.*;
import java.util.*;

/** Updates existing shop records only after every asset exists in the destination cloud. */
public class MigrateShopAssetLinks {
    static Map<String,String> manifest(String file, String cloud) throws Exception {
        Map<String,String> entries = new LinkedHashMap<>();
        for (String line : Files.readAllLines(Path.of(file)).subList(1, Files.readAllLines(Path.of(file)).size())) {
            if (line.isBlank()) continue;
            String[] fields = line.split("\t", -1);
            if (fields.length != 3 || !fields[1].startsWith("https://res.cloudinary.com/" + cloud + "/image/upload/"))
                throw new IllegalArgumentException("Unexpected cloud in manifest");
            if (entries.put(fields[2], fields[1]) != null) throw new IllegalArgumentException("Duplicate public ID");
        }
        if (entries.size() != 19) throw new IllegalArgumentException("Expected all 19 assets");
        return entries;
    }
    public static void main(String[] args) throws Exception {
        if (args.length != 2) throw new IllegalArgumentException("Usage: MigrateShopAssetLinks <old.tsv> <rvy8iqfg.tsv>");
        var old = manifest(args[0], "keticbsk");
        var target = manifest(args[1], "rvy8iqfg");
        if (!old.keySet().equals(target.keySet())) throw new IllegalArgumentException("Asset lists differ");
        String yaml = Files.readString(Path.of("backend/src/main/resources/application.yml"));
        String url = UploadShopAssets.value(yaml, "url");
        url += (url.contains("?") ? "&" : "?") + "connectTimeout=5000&socketTimeout=15000";
        try (var db = DriverManager.getConnection(url, UploadShopAssets.value(yaml,"username"), UploadShopAssets.value(yaml,"password"))) {
            db.setAutoCommit(false);
            try {
                int updated = 0;
                for (var entry : target.entrySet()) {
                    long id;
                    try (var p = db.prepareStatement("SELECT id,image_url FROM store_item WHERE image_public_id=? FOR UPDATE")) {
                        p.setString(1,entry.getKey());
                        try (var r = p.executeQuery()) {
                            if (!r.next()) throw new IllegalStateException("Missing shop item");
                            id = r.getLong(1);
                            String current = r.getString(2);
                            if (!current.equals(old.get(entry.getKey())) && !current.equals(entry.getValue()))
                                throw new IllegalStateException("Shop URL changed independently");
                            if (r.next()) throw new IllegalStateException("Duplicate shop item");
                        }
                    }
                    try (var p = db.prepareStatement("UPDATE store_item SET image_url=? WHERE id=?")) {
                        p.setString(1,entry.getValue()); p.setLong(2,id); p.executeUpdate(); updated++;
                    }
                }
                db.commit();
                System.out.println("COMMITTED migrated=" + updated + " destination=rvy8iqfg");
            } catch (Exception e) { db.rollback(); throw e; }
        }
    }
}
