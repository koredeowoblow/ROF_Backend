import crypto from 'node:crypto';
import { config } from '../config/index.js';
import { AppError } from '../core/AppError.js';

/**
 * Cloudinary Media Management Service (Class-Based, SOLID - SRP & DIP)
 *
 * Handles:
 * - Uploading single or multiple product/category images to Cloudinary
 * - Returning the permanent `secureUrl` (`url`), `publicId`, `format`, `width`, `height`
 * - Deleting images from Cloudinary by `publicId`
 * - Generating signed upload signatures for direct client-to-Cloudinary uploads
 * - Seamless fallback when running locally without live Cloudinary API credentials
 *   (no try/catch inside the service; errors bubble to routeTryCatch).
 */
export class CloudinaryService {
  constructor(cloudinaryConfig = config.cloudinary) {
    this.cloudName = cloudinaryConfig.cloudName || 'rof-rage-studio';
    this.apiKey = cloudinaryConfig.apiKey || '';
    this.apiSecret = cloudinaryConfig.apiSecret || '';
    this.defaultFolder = cloudinaryConfig.folder || 'rof_rage/products';
  }

  /**
   * Check whether live Cloudinary API credentials are configured
   */
  isLiveConfigured() {
    return Boolean(
      this.cloudName &&
        this.apiKey &&
        this.apiSecret &&
        this.apiKey !== 'your_cloudinary_api_key' &&
        this.apiSecret !== 'your_cloudinary_api_secret'
    );
  }

  /**
   * Generate Cloudinary SHA-1 signature for signed upload/destroy requests
   */
  signParams(params = {}) {
    const sortedSerialized = Object.keys(params)
      .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&');

    return crypto
      .createHash('sha1')
      .update(`${sortedSerialized}${this.apiSecret}`)
      .digest('hex');
  }

  /**
   * Generate signed parameters for client-side or studio direct upload
   */
  generateUploadSignature({ folder = this.defaultFolder, publicId } = {}) {
    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = {
      folder,
      timestamp,
      ...(publicId ? { public_id: publicId } : {}),
    };

    const signature = this.signParams(paramsToSign);
    return {
      cloudName: this.cloudName,
      apiKey: this.apiKey || 'demo_api_key',
      folder,
      timestamp,
      signature,
      uploadUrl: `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
    };
  }

  /**
   * Upload a single image (base64 Data URI or remote URL) to Cloudinary
   * Returns `{ url, secureUrl, publicId, format, width, height, bytes, folder }`
   */
  async uploadImage(fileInput, options = {}) {
    const source = typeof fileInput === 'string' ? fileInput.trim() : fileInput?.source?.trim();
    if (!source) {
      throw AppError.badRequest('Image source is required for Cloudinary upload');
    }

    // If already an uploaded Cloudinary URL or local static studio path and forceUpload isn't set,
    // normalize and return its metadata directly
    if (
      !options.forceUpload &&
      (source.includes('res.cloudinary.com/') || source.startsWith('/images/'))
    ) {
      const existingPublicId =
        options.publicId || this.extractPublicIdFromUrl(source) || `rof_${Date.now()}`;
      return {
        url: source,
        secureUrl: source,
        publicId: existingPublicId,
        format: this.detectFormat(source),
        width: options.width || 1200,
        height: options.height || 1500,
        isPrimary: Boolean(options.isPrimary ?? fileInput?.isPrimary),
      };
    }

    const folder = options.folder || this.defaultFolder;
    const timestamp = Math.round(Date.now() / 1000);
    const slugHint = String(options.publicIdPrefix || fileInput?.originalName || 'piece')
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40);
    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const publicId = options.publicId || `${slugHint || 'rof'}_${uniqueSuffix}`;

    // Live Cloudinary REST API call when credentials are provided
    if (this.isLiveConfigured()) {
      const signPayload = {
        folder,
        public_id: publicId,
        timestamp,
      };
      const signature = this.signParams(signPayload);

      const formBody = new URLSearchParams({
        file: source,
        api_key: this.apiKey,
        timestamp: String(timestamp),
        folder,
        public_id: publicId,
        signature,
      });

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formBody.toString(),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw AppError.badRequest(
          result?.error?.message || 'Cloudinary image upload failed'
        );
      }

      return {
        url: result.secure_url,
        secureUrl: result.secure_url,
        publicId: result.public_id,
        format: result.format || 'webp',
        width: result.width || 1200,
        height: result.height || 1500,
        bytes: result.bytes || 0,
        isPrimary: Boolean(options.isPrimary ?? fileInput?.isPrimary),
      };
    }

    // Deterministic Cloudinary CDN URL generation when running in local/dev environment without live keys
    const format = this.detectFormat(source);
    const fullPublicId = `${folder}/${publicId}`;
    const secureUrl = `https://res.cloudinary.com/${this.cloudName}/image/upload/f_auto,q_auto/v${timestamp}/${fullPublicId}.${format}`;

    return {
      url: secureUrl,
      secureUrl,
      publicId: fullPublicId,
      format,
      width: 1200,
      height: 1500,
      bytes: source.startsWith('data:') ? Buffer.byteLength(source.split(',')[1] || '', 'base64') : 0,
      isPrimary: Boolean(options.isPrimary ?? fileInput?.isPrimary),
    };
  }

  /**
   * Upload multiple images in order and return array of uploaded Cloudinary image descriptors
   */
  async uploadMultipleImages(files = [], options = {}) {
    if (!Array.isArray(files) || files.length === 0) {
      return [];
    }

    const uploaded = [];
    for (let i = 0; i < files.length; i += 1) {
      const item = files[i];
      const descriptor = await this.uploadImage(item, {
        ...options,
        publicIdPrefix: options.publicIdPrefix ? `${options.publicIdPrefix}-${i + 1}` : undefined,
        isPrimary: i === 0 && !files.some((f) => f?.isPrimary),
      });
      uploaded.push(descriptor);
    }

    return uploaded;
  }

  /**
   * Delete an image from Cloudinary by its `publicId`
   */
  async deleteImage(publicId) {
    if (!publicId) {
      throw AppError.badRequest('Cloudinary publicId is required to delete an image');
    }

    if (this.isLiveConfigured()) {
      const timestamp = Math.round(Date.now() / 1000);
      const signature = this.signParams({
        public_id: publicId,
        timestamp,
      });

      const formBody = new URLSearchParams({
        public_id: publicId,
        api_key: this.apiKey,
        timestamp: String(timestamp),
        signature,
      });

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formBody.toString(),
        }
      );

      const data = await response.json();
      return {
        publicId,
        deleted: data?.result === 'ok' || data?.result === 'not found',
        result: data?.result || 'ok',
      };
    }

    return {
      publicId,
      deleted: true,
      result: 'ok',
    };
  }

  detectFormat(source = '') {
    if (source.startsWith('data:image/')) {
      const mimeMatch = source.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,/);
      if (mimeMatch) {
        const ext = mimeMatch[1].toLowerCase();
        return ext === 'jpeg' ? 'jpg' : ext;
      }
    }
    const extMatch = source.match(/\.([a-zA-Z0-9]{3,4})(?:\?.*)?$/);
    if (extMatch) {
      const ext = extMatch[1].toLowerCase();
      if (['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'].includes(ext)) {
        return ext === 'jpeg' ? 'jpg' : ext;
      }
    }
    return 'webp';
  }

  extractPublicIdFromUrl(url = '') {
    const match = url.match(/\/upload\/(?:[^/]+\/)*v\d+\/(.+)\.[a-z0-9]+$/i);
    return match ? match[1] : null;
  }
}

