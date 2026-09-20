package com.jtech.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.Transformation;
import com.cloudinary.utils.ObjectUtils;
import com.jtech.dto.response.CloudinaryUploadResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Set;

@Service
public class CloudinaryService {

    private static final String TARGET_ASSET_FOLDER = "Video/jtech/customer_upload/video";
    private static final Set<String> ALLOWED_VIDEO_CONTENT_TYPES = Set.of(
            "video/mp4",
            "video/webm",
            "video/ogg",
            "video/quicktime",
            "video/x-msvideo",
            "video/x-matroska"
    );

    private final Cloudinary cloudinary;

    public CloudinaryService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    public CloudinaryUploadResponse uploadVideo(MultipartFile file) {
        System.out.println("========== CLOUDINARY UPLOAD START ==========");
    System.out.println("File: " + (file != null ? file.getOriginalFilename() : "NULL"));
    System.out.println("Size: " + (file != null ? file.getSize() : -1));
    System.out.println("Content type: " + (file != null ? file.getContentType() : "NULL"));
        validateVideoFile(file);
        System.out.println("Cloudinary validation passed");

        Path tempFile = null;
        try {
            String suffix = resolveSuffix(file.getOriginalFilename(), file.getContentType());
            tempFile = Files.createTempFile("video-upload-", suffix);
            file.transferTo(tempFile);
            System.out.println("Temporary file created: " + tempFile);
System.out.println("Temporary file size: " + Files.size(tempFile));
System.out.println("Calling Cloudinary uploadLarge...");

            @SuppressWarnings("unchecked")
            Map<String, Object> uploadResult = (Map<String, Object>) cloudinary.uploader().uploadLarge(
                    tempFile.toFile(),
                    ObjectUtils.asMap(
                            "resource_type", "video",
                            "folder", TARGET_ASSET_FOLDER,
                            "use_filename", true,
                            "unique_filename", false,
                            "overwrite", false
                    )
            );
            System.out.println("========== CLOUDINARY UPLOAD SUCCESS ==========");
System.out.println("Secure URL: " + uploadResult.get("secure_url"));
System.out.println("Public ID: " + uploadResult.get("public_id"));
System.out.println("Resource type: " + uploadResult.get("resource_type"));
System.out.println("Format: " + uploadResult.get("format"));

            return new CloudinaryUploadResponse(
                    asString(uploadResult.get("secure_url")),
                    asString(uploadResult.get("public_id")),
                    asString(uploadResult.get("resource_type")),
                    asString(uploadResult.get("format")),
                    asDouble(uploadResult.get("duration")),
                    asInteger(uploadResult.get("width")),
                    asInteger(uploadResult.get("height")),
                    buildThumbnailUrl(uploadResult)
            );
        } catch (Exception e) {
            System.out.println("========== CLOUDINARY UPLOAD FAILED ==========");
    e.printStackTrace();

    throw new IllegalStateException(
        "Failed to upload video to Cloudinary",
        e
    );
        } finally {
            if (tempFile != null) {
                try {
                    Files.deleteIfExists(tempFile);
                } catch (IOException ignored) {
                }
            }
        }
    }

    public void deleteVideo(String publicId) {
        if (publicId == null || publicId.isBlank()) {
            return;
        }

        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", "video"));
        } catch (IOException e) {
            throw new IllegalStateException("Failed to delete video from Cloudinary", e);
        }
    }

    public String buildSecureVideoUrl(String publicId, String format) {
        if (publicId == null || publicId.isBlank()) {
            return null;
        }

        String normalizedFormat = (format == null || format.isBlank()) ? "mp4" : format;
        return cloudinary.url()
                .secure(true)
                .resourceType("video")
                .format(normalizedFormat)
                .generate(publicId);
    }

    public String buildSecureVideoUrl(String publicId) {
        return buildSecureVideoUrl(publicId, "mp4");
    }

    private void validateVideoFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Video file is required");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("video/") || !ALLOWED_VIDEO_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("Unsupported video file type");
        }
    }

    private String resolveSuffix(String originalFilename, String contentType) {
        if (originalFilename != null) {
            int dotIndex = originalFilename.lastIndexOf('.');
            if (dotIndex >= 0 && dotIndex < originalFilename.length() - 1) {
                String extension = originalFilename.substring(dotIndex);
                return extension.replaceAll("[^a-zA-Z0-9.]", "_");
            }
        }

        if ("video/mp4".equalsIgnoreCase(contentType)) {
            return ".mp4";
        }
        if ("video/webm".equalsIgnoreCase(contentType)) {
            return ".webm";
        }
        if ("video/quicktime".equalsIgnoreCase(contentType)) {
            return ".mov";
        }
        if ("video/ogg".equalsIgnoreCase(contentType)) {
            return ".ogv";
        }
        if ("video/x-matroska".equalsIgnoreCase(contentType)) {
            return ".mkv";
        }
        return ".tmp";
    }

    private String buildThumbnailUrl(Map<String, Object> uploadResult) {
        String publicId = asString(uploadResult.get("public_id"));
        if (publicId == null || publicId.isBlank()) {
            return null;
        }

        return cloudinary.url()
                .secure(true)
                .resourceType("video")
                .transformation(new Transformation().crop("fill").width(640).height(360))
                .format("jpg")
                .generate(publicId);
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private Double asDouble(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return Double.valueOf(String.valueOf(value));
    }

    private Integer asInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        return Integer.valueOf(String.valueOf(value));
    }
}