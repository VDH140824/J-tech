import com.cloudinary.Cloudinary;
import java.nio.file.*;
import java.util.*;

/** Moves only assets recorded in the shop upload manifest; preserves delivery URLs. */
public class MoveShopAssetsToAvatar {
    public static void main(String[] args) throws Exception {
        String yaml = Files.readString(Path.of("backend/src/main/resources/application.yml"));
        if (!"keticbsk".equals(UploadShopAssets.value(yaml,"cloud-name")))
            throw new IllegalStateException("Expected cloud keticbsk");
        var cloud = new Cloudinary(Map.of("cloud_name", UploadShopAssets.value(yaml,"cloud-name"),
            "api_key", UploadShopAssets.value(yaml,"api-key"),
            "api_secret", UploadShopAssets.value(yaml,"api-secret"), "secure", true));
        String folder = args.length == 0 ? "Jtech/Users/Avatar" : args[0];
        if (!Set.of("Jtech/Users/Avatar", "Jtech/Users/Item").contains(folder))
            throw new IllegalArgumentException("Unexpected destination folder");
        var lines = Files.readAllLines(Path.of("doc/shop-assets.tsv"));
        var assets = new ArrayList<String[]>();
        for (String line : lines.subList(1,lines.size())) {
            if (line.isBlank()) continue;
            String[] fields = line.split("\t",-1);
            if (fields.length != 3 || !fields[2].startsWith("jtech/shop/")) throw new IllegalStateException("Invalid manifest");
            assets.add(fields);
        }
        if (assets.size() != 19) throw new IllegalStateException("Expected 19 assets");
        // Inspect all assets before mutating: asset_folder exists only in dynamic folder mode.
        for (String[] asset : assets) {
            var info = cloud.api().resource(asset[2],Map.of("resource_type","image"));
            if (!info.containsKey("asset_folder")) throw new IllegalStateException("Dynamic folders required to preserve URLs");
            System.out.println("FOUND " + asset[0] + " folder=" + info.get("asset_folder"));
        }
        for (String[] asset : assets) {
            cloud.uploader().explicit(asset[2],Map.of("type","upload","resource_type","image","asset_folder",folder));
            var verified = cloud.api().resource(asset[2],Map.of("resource_type","image"));
            if (!folder.equals(verified.get("asset_folder")) || !asset[2].equals(verified.get("public_id")))
                throw new IllegalStateException("Folder verification failed");
            if (!asset[1].equals(verified.get("secure_url"))) throw new IllegalStateException("URL changed unexpectedly");
            System.out.println("VERIFIED " + asset[0] + " -> " + folder);
        }
        System.out.println("DONE moved=19 URLs unchanged");
    }
}
