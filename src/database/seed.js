import fs from 'node:fs';
import path from 'node:path';
import { mongoDatabase } from './MongoDatabase.js';
import { config } from '../config/index.js';
import { CloudinaryService } from '../services/cloudinary.service.js';
import {
  initialCategories,
  initialProducts,
  initialReviews,
  initialWishlists,
  initialOrders,
  initialMessages,
  initialDiscounts,
  initialAuditLog,
  initialContentConfig,
  createInitialUsers,
  initialSettings,
} from './initialData.js';
import {
  CategoryModel,
  ProductModel,
  ReviewModel,
  WishlistModel,
  OrderModel,
  UserModel,
  DiscountModel,
  MessageModel,
  ContentModel,
  AuditModel,
  SettingsModel,
} from '../models/index.js';
import { logger } from '../utils/logger.js';

/**
 * Class-Based MongoDB Database Seeder
 * Verifies local image assets in public/images/*.webp, optionally syncs to Cloudinary
 * when live credentials are configured, and seeds all 11 collections.
 */
export class DatabaseSeeder {
  static resolvePublicImagesDir() {
    const backendImagesDir = path.resolve(process.cwd(), 'public/images');
    if (fs.existsSync(backendImagesDir)) {
      return backendImagesDir;
    }
    const siblingFrontendImagesDir = path.resolve(process.cwd(), '../ROF/public/images');
    if (fs.existsSync(siblingFrontendImagesDir)) {
      return siblingFrontendImagesDir;
    }
    return backendImagesDir;
  }

  static async syncProductAndCategoryImages(products, categories) {
    const imagesDir = DatabaseSeeder.resolvePublicImagesDir();
    const cloudinary = new CloudinaryService();
    const hasLiveCloudinary =
      cloudinary.isConfigured() &&
      config.cloudinary?.cloudName &&
      config.cloudinary.cloudName !== 'rof-rage-studio' &&
      config.cloudinary.cloudName !== 'demo';

    const seededProducts = [];
    for (const prod of products) {
      const copy = structuredClone(prod);
      const primaryRelPath = copy.images?.[0] || copy.thumbnailUrl || '';
      const fileName = path.basename(primaryRelPath);
      const diskPath = path.join(imagesDir, fileName);

      if (fs.existsSync(diskPath) && hasLiveCloudinary) {
        const fileBuffer = fs.readFileSync(diskPath);
        const base64Uri = `data:image/webp;base64,${fileBuffer.toString('base64')}`;
        const uploaded = await cloudinary.uploadImage(base64Uri, {
          folder: 'rof_rage/products',
          publicId: copy.slug,
        });
        copy.thumbnailUrl = uploaded.url;
        copy.images = [uploaded.url, uploaded.url];
        copy.cloudinaryImages = [
          {
            url: uploaded.url,
            publicId: uploaded.publicId,
            format: uploaded.format || 'webp',
            width: uploaded.width || 1200,
            height: uploaded.height || 1500,
            isPrimary: true,
          },
        ];
      }
      seededProducts.push(copy);
    }

    const seededCategories = [];
    for (const cat of categories) {
      const copy = structuredClone(cat);
      const fileName = path.basename(copy.bannerImage || '');
      const diskPath = path.join(imagesDir, fileName);

      if (fs.existsSync(diskPath) && hasLiveCloudinary) {
        const fileBuffer = fs.readFileSync(diskPath);
        const base64Uri = `data:image/webp;base64,${fileBuffer.toString('base64')}`;
        const uploaded = await cloudinary.uploadImage(base64Uri, {
          folder: 'rof_rage/categories',
          publicId: copy.slug,
        });
        copy.bannerImage = uploaded.url;
        copy.bannerPublicId = uploaded.publicId;
      }
      seededCategories.push(copy);
    }

    return { seededProducts, seededCategories };
  }

  static async seed({ forceReset = false } = {}) {
    await mongoDatabase.connect();

    if (forceReset) {
      await Promise.all([
        CategoryModel.deleteMany({}),
        ProductModel.deleteMany({}),
        ReviewModel.deleteMany({}),
        WishlistModel.deleteMany({}),
        OrderModel.deleteMany({}),
        UserModel.deleteMany({}),
        DiscountModel.deleteMany({}),
        MessageModel.deleteMany({}),
        ContentModel.deleteMany({}),
        AuditModel.deleteMany({}),
        SettingsModel.deleteMany({}),
      ]);
    }

    const { seededProducts, seededCategories } =
      await DatabaseSeeder.syncProductAndCategoryImages(initialProducts, initialCategories);

    const categoryCount = await CategoryModel.countDocuments();
    if (categoryCount === 0) {
      await CategoryModel.insertMany(seededCategories);
    }

    const productCount = await ProductModel.countDocuments();
    if (productCount === 0) {
      await ProductModel.insertMany(seededProducts);
    }

    const reviewCount = await ReviewModel.countDocuments();
    if (reviewCount === 0) {
      await ReviewModel.insertMany(initialReviews);
    }

    const wishlistCount = await WishlistModel.countDocuments();
    if (wishlistCount === 0 && Array.isArray(initialWishlists)) {
      await WishlistModel.insertMany(initialWishlists);
    }

    const orderCount = await OrderModel.countDocuments();
    if (orderCount === 0) {
      await OrderModel.insertMany(initialOrders);
    }

    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      await UserModel.insertMany(createInitialUsers());
    }

    const discountCount = await DiscountModel.countDocuments();
    if (discountCount === 0) {
      await DiscountModel.insertMany(initialDiscounts);
    }

    const messageCount = await MessageModel.countDocuments();
    if (messageCount === 0) {
      await MessageModel.insertMany(initialMessages);
    }

    const contentCount = await ContentModel.countDocuments();
    if (contentCount === 0) {
      await ContentModel.create({ id: 'brand-content', ...initialContentConfig });
    }

    const auditCount = await AuditModel.countDocuments();
    if (auditCount === 0) {
      await AuditModel.insertMany(initialAuditLog);
    }

    const settingsCount = await SettingsModel.countDocuments();
    if (settingsCount === 0) {
      await SettingsModel.create(initialSettings);
    }

    logger.info(
      'MongoDB collections verified and seeded with ROF RAGE initial dataset and public/images assets'
    );
  }
}

// Run directly when executed via `npm run seed`
const isDirectExecution = process.argv[1] && process.argv[1].endsWith('seed.js');
if (isDirectExecution) {
  DatabaseSeeder.seed({ forceReset: true })
    .then(() => mongoDatabase.disconnect())
    .catch((err) => {
      logger.error('Failed to seed MongoDB', { error: err.message });
      process.exit(1);
    });
}
