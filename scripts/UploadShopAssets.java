import com.cloudinary.Cloudinary;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Pattern;

/** One-time import: keeps original PNG/GIF files and records Cloudinary references. */
public class UploadShopAssets {
    static String value(String text, String key) {
        var m = Pattern.compile("(?m)^\\s*" + key + ":\\s*(.*?)\\s*$").matcher(text);
        if (!m.find()) throw new IllegalArgumentException("Missing configuration: " + key);
        String s = m.group(1).trim();
        if (s.length() > 1 && ((s.startsWith("\"") && s.endsWith("\"")) || (s.startsWith("'") && s.endsWith("'")))) s = s.substring(1, s.length()-1);
        if (s.startsWith("${") && s.endsWith("}")) {
            String[] parts = s.substring(2, s.length()-1).split(":", 2);
            s = System.getenv(parts[0]);
            if (s == null && parts.length == 2) s = parts[1];
        }
        if (s == null || s.isBlank()) throw new IllegalArgumentException("Empty configuration: " + key);
        return s;
    }
    public static void main(String[] args) throws Exception {
        if (args.length != 2) throw new IllegalArgumentException("Usage: UploadShopAssets <source-directory> <manifest.tsv>");
        String yaml = Files.readString(Path.of("backend/src/main/resources/application.yml"));
        Cloudinary cloud = new Cloudinary(Map.of("cloud_name", value(yaml,"cloud-name"), "api_key", value(yaml,"api-key"), "api_secret", value(yaml,"api-secret"), "secure", true));
        Path manifest = Path.of(args[1]);
        Files.createDirectories(manifest.toAbsolutePath().getParent());
        Set<String> done = new HashSet<>();
        if (Files.exists(manifest)) for (String line : Files.readAllLines(manifest)) done.add(line.split("\t", -1)[0]);
        else Files.writeString(manifest, "filename\timage_url\timage_public_id\n", StandardCharsets.UTF_8);
        List<Path> files;
        try (var stream = Files.list(Path.of(args[0]))) {
            files = stream.filter(Files::isRegularFile).filter(p -> p.toString().toLowerCase(Locale.ROOT).matches(".*\\.(png|gif|jpe?g|webp)$")).sorted().toList();
        }
        for (Path file : files) {
            String name = file.getFileName().toString();
            if (done.contains(name)) { System.out.println("SKIP " + name); continue; }
            String stem = name.substring(0, name.lastIndexOf('.')).replaceAll("[^a-zA-Z0-9_-]", "_");
            try {
                Map result = cloud.uploader().upload(file.toFile(), Map.of("resource_type", "image", "public_id", "jtech/shop/" + stem, "overwrite", false));
                Object url = result.get("secure_url"), id = result.get("public_id");
                if (url == null || id == null || !url.toString().startsWith("https://res.cloudinary.com/")) throw new IllegalStateException("Missing upload references");
                Files.writeString(manifest, name + "\t" + url + "\t" + id + "\n", StandardCharsets.UTF_8, StandardOpenOption.APPEND);
                System.out.println("UPLOADED " + name);
            } catch (Exception e) {
                System.err.println("UPLOAD_FAILED " + name + " (" + e.getClass().getSimpleName() + "). Completed uploads are saved in manifest.");
                System.exit(1);
            }
        }
        System.out.println("Manifest: " + manifest);
    }
}
