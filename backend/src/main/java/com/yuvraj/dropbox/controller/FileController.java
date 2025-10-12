package com.yuvraj.dropbox.controller;

import com.yuvraj.dropbox.auth.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.web.server.ResponseStatusException;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;

import java.io.FileOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
@RequestMapping("/files")
public class FileController {

    private static final Logger log = LoggerFactory.getLogger(FileController.class);

    @Value("${dropbox.upload.dir}")
    private String uploadDir;

    // DTO returned to frontend
    public static class FileInfo {
        private String name;
        private String type; // "file" or "folder"
        private String path; // relative path inside user's folder
        private Long size; // bytes, null for folders
        private Long lastModified; // epoch millis

        public FileInfo() {}

        public FileInfo(String name, String type, String path, Long size, Long lastModified) {
            this.name = name;
            this.type = type;
            this.path = path;
            this.size = size;
            this.lastModified = lastModified;
        }

        public String getName() { return name; }
        public String getType() { return type; }
        public String getPath() { return path; }
        public Long getSize() { return size; }
        public Long getLastModified() { return lastModified; }
    }

    /* ------------------ helpers ------------------ */

    // Extract the path part after the mapping (for mappings using /**)
    private String extractRelativePath(HttpServletRequest request) {
        String pathWithinHandler = (String) request.getAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE);
        String bestMatchPattern = (String) request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        if (pathWithinHandler == null || bestMatchPattern == null) return "";
        return new AntPathMatcher().extractPathWithinPattern(bestMatchPattern, pathWithinHandler);
    }

    // Resolve and sanitize a path within the user's folder (prevents path traversal)
    private Path resolvePathWithinUser(Path userFolder, String relative) {
        Path resolved = (relative == null || relative.isBlank())
                ? userFolder
                : userFolder.resolve(relative);
        resolved = resolved.normalize();
        if (!resolved.startsWith(userFolder)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid path (path traversal)");
        }
        return resolved;
    }

    // Build DTO from a file system path
    private FileInfo buildFileInfo(Path userFolder, Path p) {
        try {
            boolean isDir = Files.isDirectory(p);
            String rel = userFolder.relativize(p).toString().replace('\\','/');
            Long size = isDir ? null : Files.size(p);
            Long last = Files.getLastModifiedTime(p).toMillis();
            return new FileInfo(p.getFileName().toString(),
                    isDir ? "folder" : "file",
                    rel,
                    size,
                    last);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to read file metadata", e);
        }
    }

    // Read JWT and return user folder Path
    private Path getUserFolder(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing or invalid Authorization header");
        }
        String token = authHeader.substring(7);
        String uuid = JwtUtil.validateTokenAndGetUUID(token);
        if (uuid == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token");

        Path userFolder = Paths.get(uploadDir).resolve(uuid).normalize();
        if (!Files.exists(userFolder) || !Files.isDirectory(userFolder)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User folder missing");
        }
        return userFolder;
    }

    /* ------------------ endpoints ------------------ */

    /**
     * List files and folders at the given (nested) path inside the user's folder.
     * GET /files/list
     * GET /files/list/** (e.g. /files/list/folder1/folder2)
     */
    @GetMapping({"/list", "/list/**"})
    public List<FileInfo> listFiles(HttpServletRequest request) {
        Path userFolder = getUserFolder(request);
        String rel = extractRelativePath(request);
        Path target = resolvePathWithinUser(userFolder, rel);

        if (!Files.exists(target)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Path not found");
        }

        if (Files.isRegularFile(target)) {
            // If target is a file, return info for that single file
            return Collections.singletonList(buildFileInfo(userFolder, target));
        }

        // target is a directory -> list top-level children
        try (Stream<Path> stream = Files.list(target)) {
            return stream
                    .sorted(Comparator.comparing(Path::getFileName))
                    .map(p -> buildFileInfo(userFolder, p))
                    .collect(Collectors.toList());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to list directory", e);
        }
    }

    /**
     * Make directory at nested path.
     * POST /files/mkdir/** (e.g. /files/mkdir/new/folder)
     */
    @PostMapping({"/mkdir", "/mkdir/**"})
    public FileInfo makeDirectory(HttpServletRequest request) {
        Path userFolder = getUserFolder(request);
        String rel = extractRelativePath(request);
        if (rel == null || rel.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing folder name");
        }

        // Normalize to prevent "../" path traversal
        Path targetDir = userFolder.resolve(rel).normalize();

        if (!targetDir.startsWith(userFolder)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid path");
        }

        if (Files.exists(targetDir)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Folder already exists");
        }

        try {
            Files.createDirectories(targetDir);
            return buildFileInfo(userFolder, targetDir);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to create directory", e);
        }
    }

    /**
     * Upload one or more files to the nested path (target must be a directory; created if missing).
     * POST /files/upload
     * POST /files/upload/**  (e.g. /files/upload/folder1/folder2)
     * Form field name: "file" (supports multiple)
     */
    @PostMapping({"/upload", "/upload/**"})
    public List<FileInfo> uploadFiles(HttpServletRequest request, @RequestParam("file") MultipartFile[] files) {
        if (files == null || files.length == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No file provided");
        }
        Path userFolder = getUserFolder(request);
        String rel = extractRelativePath(request);
        Path dir = resolvePathWithinUser(userFolder, rel);
        try {
            Files.createDirectories(dir);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to create upload directory", e);
        }
        List<FileInfo> uploaded = new ArrayList<>();
        for (MultipartFile mf : files) {
            String original = mf.getOriginalFilename();
            if (original == null || original.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing file name");
            }
            Path target = dir.resolve(original).normalize();
            if (!target.startsWith(userFolder)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file name");
            }
            if (Files.exists(target)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "File already exists");
            }
            try {
                Files.copy(mf.getInputStream(), target);
                uploaded.add(buildFileInfo(userFolder, target));
            } catch (IOException e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to save file: " + original, e);
            }
        }
        return uploaded;
    }

    /**
     * Download a file at nested path:
     * GET /files/download/**  (e.g. /files/download/folder1/file.txt)
     */
    @GetMapping("/download/**")
    public ResponseEntity<Resource> downloadFile(HttpServletRequest request) throws Exception {
        Path userFolder = getUserFolder(request);
        String restOfPath = request.getRequestURI().split("/download/")[1];
        restOfPath = java.net.URLDecoder.decode(restOfPath, java.nio.charset.StandardCharsets.UTF_8);
        Path filePath = userFolder.resolve(restOfPath).normalize();
        if (!Files.exists(filePath)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found");
        }
        Resource resource;
        String filename;
        String contentType = "application/octet-stream";
        String disposition = "attachment";
        if (Files.isDirectory(filePath)) {
            Path zipPath = Files.createTempFile("download-", ".zip");
            try (FileOutputStream fos = new FileOutputStream(zipPath.toFile());
                java.util.zip.ZipOutputStream zos = new java.util.zip.ZipOutputStream(fos)) {
                zipDirectory(filePath, filePath.getFileName().toString(), zos);
            }
            resource = new UrlResource(zipPath.toUri());
            filename = filePath.getFileName().toString() + ".zip";
        } else {
            resource = new UrlResource(filePath.toUri());
            filename = filePath.getFileName().toString();
            try {
                contentType = Files.probeContentType(filePath);
            } catch (IOException ignored) {}
            String forceDownload = request.getParameter("download");
            if ("true".equalsIgnoreCase(forceDownload)) {
                disposition = "attachment";
            } else if (contentType != null && (contentType.equals("application/pdf") || contentType.startsWith("image/"))) {
                disposition = "inline";
            } else {
                disposition = "attachment";
            }
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition + "; filename=\"" + filename + "\"")
                .header(HttpHeaders.CONTENT_TYPE, contentType != null ? contentType : "application/octet-stream")
                .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                .header(HttpHeaders.PRAGMA, "no-cache")
                .header(HttpHeaders.EXPIRES, "0")
                .body(resource);
    }

    // Helper method to zip folder recursively
    private void zipDirectory(Path folder, String parentFolder, java.util.zip.ZipOutputStream zos) throws Exception {
        Files.walk(folder).forEach(path -> {
            try {
                String entryName = parentFolder + "/" + folder.relativize(path).toString();
                if (Files.isDirectory(path)) return; // skip directories in zip entry
                zos.putNextEntry(new java.util.zip.ZipEntry(entryName));
                Files.copy(path, zos);
                zos.closeEntry();
            } catch (Exception e) {
                throw new RuntimeException("Error zipping folder", e);
            }
        });
    }




    /**
     * Delete a file or folder (recursively) at nested path.
     * DELETE /files/delete/**  (e.g. /files/delete/folder1/file.txt  OR /files/delete/folder1/subfolder)
     */
    @DeleteMapping({"/delete", "/delete/**"})
    public Map<String, Object> delete(HttpServletRequest request) {
        Path userFolder = getUserFolder(request);
        String rel = extractRelativePath(request);
        if (rel == null || rel.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing required fields");
        }
        rel = java.net.URLDecoder.decode(rel, java.nio.charset.StandardCharsets.UTF_8);
        Path target = resolvePathWithinUser(userFolder, rel);
        if (!Files.exists(target)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File or folder not found");
        }
        try {
            if (Files.isDirectory(target)) {
                try (Stream<Path> walk = Files.walk(target)) {
                    walk.sorted(Comparator.reverseOrder())
                        .forEach(p -> {
                            try { Files.deleteIfExists(p); }
                            catch (IOException ex) { throw new RuntimeException(ex); }
                        });
                }
            } else {
                Files.delete(target);
            }
        } catch (RuntimeException ex) {
            Throwable cause = ex.getCause();
            if (cause instanceof ResponseStatusException) throw (ResponseStatusException) cause;
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete", ex);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete", e);
        }
        Map<String,Object> resp = new HashMap<>();
        resp.put("deleted", rel);
        resp.put("success", true);
        return resp;
    }
}
