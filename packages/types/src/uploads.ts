export interface PresignedUrlRequest {
  filename: string; // Original filename (for extension)
  contentType: string; // Validated MIME type (e.g., 'image/png')
  contentLength: number; // File size in bytes
}

export interface PresignedUrlResponse {
  presignedUrl: string; // The temporary URL to PUT the file to
  objectKey: string; // The S3 key where the object will be stored (in temp prefix)
}

export interface ConfirmUploadRequest {
  tempObjectKey: string; // The S3 key in the temporary location
}
