package com.jtech.dto.response;

public class CloudinaryUploadResponse {

    private String videoUrl;
    private String publicId;
    private String resourceType;
    private String format;
    private Double duration;
    private Integer width;
    private Integer height;
    private String thumbnailUrl;

    public CloudinaryUploadResponse() {
    }

    public CloudinaryUploadResponse(
            String videoUrl,
            String publicId,
            String resourceType,
            String format,
            Double duration,
            Integer width,
            Integer height,
            String thumbnailUrl) {
        this.videoUrl = videoUrl;
        this.publicId = publicId;
        this.resourceType = resourceType;
        this.format = format;
        this.duration = duration;
        this.width = width;
        this.height = height;
        this.thumbnailUrl = thumbnailUrl;
    }

    public String getVideoUrl() {
        return videoUrl;
    }

    public void setVideoUrl(String videoUrl) {
        this.videoUrl = videoUrl;
    }

    public String getPublicId() {
        return publicId;
    }

    public void setPublicId(String publicId) {
        this.publicId = publicId;
    }

    public String getResourceType() {
        return resourceType;
    }

    public void setResourceType(String resourceType) {
        this.resourceType = resourceType;
    }

    public String getFormat() {
        return format;
    }

    public void setFormat(String format) {
        this.format = format;
    }

    public Double getDuration() {
        return duration;
    }

    public void setDuration(Double duration) {
        this.duration = duration;
    }

    public Integer getWidth() {
        return width;
    }

    public void setWidth(Integer width) {
        this.width = width;
    }

    public Integer getHeight() {
        return height;
    }

    public void setHeight(Integer height) {
        this.height = height;
    }

    public String getThumbnailUrl() {
        return thumbnailUrl;
    }

    public void setThumbnailUrl(String thumbnailUrl) {
        this.thumbnailUrl = thumbnailUrl;
    }
}