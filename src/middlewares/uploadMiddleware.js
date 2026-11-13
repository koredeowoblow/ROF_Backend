import { AppError } from '../core/AppError.js';
import { config } from '../config/index.js';

/**
 * Class-Based Image Upload Parser Middleware (SOLID - SRP)
 *
 * Supports:
 * 1. `multipart/form-data` binary file uploads (parses boundaries, extracts file buffers,
 *    validates image MIME types and size limits, and converts to Data URIs in `req.uploadedFiles`).
 * 2. `application/json` payloads containing base64 data URIs (`data:image/webp;base64,...`)
 *    or remote image URLs in `req.body.file`, `req.body.files`, `req.body.imageFiles`, or `req.body.images`.
 */
export class UploadMiddleware {
  static ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif',
  ]);

  static parseImages(options = {}) {
    const maxFiles = options.maxFiles || 8;
    const maxSizeBytes = options.maxSizeBytes || config.cloudinary.maxFileSizeBytes;

    return (req, _res, next) => {
      const contentType = String(req.headers?.['content-type'] || '');

      // Case 1: JSON body with base64 data URIs or remote URLs
      if (!contentType.startsWith('multipart/form-data')) {
        const extracted = [];
        const rawList =
          req.body?.imageFiles ||
          req.body?.files ||
          (req.body?.file ? [req.body.file] : null) ||
          (Array.isArray(req.body?.images) ? req.body.images : []);

        for (const item of rawList) {
          if (typeof item === 'string' && item.trim()) {
            UploadMiddleware.validateDataUriOrUrl(item.trim(), maxSizeBytes);
            extracted.push({
              source: item.trim(),
              originalName: 'upload',
            });
          } else if (item && typeof item === 'object' && typeof item.data === 'string') {
            UploadMiddleware.validateDataUriOrUrl(item.data.trim(), maxSizeBytes);
            extracted.push({
              source: item.data.trim(),
              originalName: item.name || item.filename || 'upload',
              isPrimary: Boolean(item.isPrimary),
            });
          }
        }

        if (extracted.length > maxFiles) {
          throw AppError.badRequest(`Maximum of ${maxFiles} images allowed per upload`);
        }

        req.uploadedFiles = extracted;
        return next();
      }

      // Case 2: multipart/form-data stream parsing
      const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
      const boundary = boundaryMatch ? boundaryMatch[1] || boundaryMatch[2] : null;
      if (!boundary) {
        throw AppError.badRequest('Invalid multipart/form-data boundary header');
      }

      const chunks = [];
      let totalBytes = 0;

      req.on('data', (chunk) => {
        totalBytes += chunk.length;
        if (totalBytes > maxSizeBytes * maxFiles) {
          req.destroy();
          return next(
            AppError.badRequest(
              `Upload payload exceeds maximum size limit of ${Math.round((maxSizeBytes * maxFiles) / (1024 * 1024))}MB`
            )
          );
        }
        chunks.push(chunk);
      });

      req.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const { fields, files } = UploadMiddleware.parseMultipartBuffer(
          buffer,
          boundary,
          maxSizeBytes
        );

        if (files.length > maxFiles) {
          return next(AppError.badRequest(`Maximum of ${maxFiles} images allowed per upload`));
        }

        req.body = { ...(req.body || {}), ...fields };
        req.uploadedFiles = files;
        return next();
      });

      req.on('error', (err) => next(err));
    };
  }

  static validateDataUriOrUrl(input, maxSizeBytes) {
    if (input.startsWith('data:')) {
      const match = input.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
      if (!match) {
        throw AppError.badRequest('Malformed base64 image data URI');
      }
      const mimeType = match[1].toLowerCase();
      if (!UploadMiddleware.ALLOWED_MIME_TYPES.has(mimeType)) {
        throw AppError.badRequest(
          `Unsupported image MIME type '${mimeType}'. Allowed: jpeg, png, webp, avif, gif`
        );
      }
      const byteLength = Buffer.byteLength(match[2], 'base64');
      if (byteLength > maxSizeBytes) {
        throw AppError.badRequest(
          `Image size (${Math.round(byteLength / 1024)}KB) exceeds limit (${Math.round(maxSizeBytes / (1024 * 1024))}MB)`
        );
      }
      return;
    }

    if (
      !input.startsWith('http://') &&
      !input.startsWith('https://') &&
      !input.startsWith('/images/')
    ) {
      throw AppError.badRequest(
        'Image must be a valid base64 Data URI, https:// URL, or studio asset path'
      );
    }
  }

  static parseMultipartBuffer(buffer, boundary, maxSizeBytes) {
    const fields = {};
    const files = [];
    const delimiter = `--${boundary}`;
    const rawText = buffer.toString('latin1');
    const parts = rawText.split(delimiter).slice(1, -1);

    for (const part of parts) {
      const cleanedPart = part.replace(/^\r\n/, '').replace(/\r\n$/, '');
      const headerEndIdx = cleanedPart.indexOf('\r\n\r\n');
      if (headerEndIdx === -1) continue;

      const rawHeaders = cleanedPart.slice(0, headerEndIdx);
      const rawBody = cleanedPart.slice(headerEndIdx + 4);

      const dispositionMatch = rawHeaders.match(/name="([^"]+)"(?:;\s*filename="([^"]*)")?/i);
      if (!dispositionMatch) continue;

      const fieldName = dispositionMatch[1];
      const filename = dispositionMatch[2];

      if (filename !== undefined && filename !== '') {
        const typeMatch = rawHeaders.match(/Content-Type:\s*([^\r\n;]+)/i);
        const mimeType = typeMatch ? typeMatch[1].trim().toLowerCase() : 'image/webp';

        if (!UploadMiddleware.ALLOWED_MIME_TYPES.has(mimeType)) {
          throw AppError.badRequest(
            `Unsupported uploaded file type '${mimeType}'. Allowed: jpeg, png, webp, avif, gif`
          );
        }

        const fileBuffer = Buffer.from(rawBody, 'latin1');
        if (fileBuffer.length > maxSizeBytes) {
          throw AppError.badRequest(
            `File '${filename}' exceeds maximum allowed size of ${Math.round(maxSizeBytes / (1024 * 1024))}MB`
          );
        }

        const dataUri = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
        files.push({
          fieldName,
          originalName: filename,
          mimeType,
          size: fileBuffer.length,
          source: dataUri,
        });
      } else {
        const textValue = Buffer.from(rawBody, 'latin1').toString('utf8');
        if (
          (textValue.startsWith('{') && textValue.endsWith('}')) ||
          (textValue.startsWith('[') && textValue.endsWith(']'))
        ) {
          fields[fieldName] = JSON.parse(textValue);
        } else {
          fields[fieldName] = textValue;
        }
      }
    }

    return { fields, files };
  }
}

