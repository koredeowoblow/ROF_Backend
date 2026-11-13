import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { AppError } from '../src/core/AppError.js';
import { BaseDTO } from '../src/core/BaseDTO.js';
import { Paginator } from '../src/utils/pagination.js';
import { RequestSanitizer } from '../src/middlewares/requestSanitizer.js';
import { IdorProtection } from '../src/middlewares/idorProtection.js';
import { TryCatchHandler } from '../src/middlewares/tryCatchHandler.js';
import { ResponseHandler } from '../src/utils/responseHandler.js';
import { ProductValidator } from '../src/validators/product.validator.js';
import { CategoryValidator } from '../src/validators/category.validator.js';
import { ReviewValidator } from '../src/validators/review.validator.js';
import { OrderValidator } from '../src/validators/order.validator.js';
import { AuthValidator } from '../src/validators/auth.validator.js';
import { MessageValidator } from '../src/validators/message.validator.js';
import {
  PublicOrderResponseDTO,
  AdminOrderResponseDTO,
  OrderTrackingResponseDTO,
} from '../src/dtos/order.dto.js';
import { SaveProductRequestDTO } from '../src/dtos/product.dto.js';
import { SaveCategoryRequestDTO } from '../src/dtos/category.dto.js';
import { CreateMessageRequestDTO, ReplyMessageRequestDTO } from '../src/dtos/message.dto.js';
import { CloudinaryService } from '../src/services/cloudinary.service.js';
import { ProductService } from '../src/services/product.service.js';
import { CategoryService } from '../src/services/category.service.js';
import { ReviewService } from '../src/services/review.service.js';
import { WishlistService } from '../src/services/wishlist.service.js';
import { AuthService } from '../src/services/auth.service.js';
import { AdminService } from '../src/services/admin.service.js';
import { OrderService } from '../src/services/order.service.js';
import { PaymentService } from '../src/services/payment.service.js';
import { MessageService } from '../src/services/message.service.js';
import { cryptoService } from '../src/utils/crypto.js';

describe('ROF RAGE Backend Architecture Suite (SOLID, DRY, Sanitizer, IDOR, Pagination, ResponseHandler, Auth, Tracking, Messages, Cloudinary, Categories, Reviews, Wishlist)', () => {
  it('RequestSanitizer strips XSS tags, inline event handlers, prototype pollution, and NoSQL $ operators', () => {
    const sanitizer = new RequestSanitizer();
    const dirtyInput = JSON.parse(
      '{"name":"  <script>alert(1)</script>Chidi  ","__proto__":{"polluted":true},"$where":"1==1","nested":{"note":"<img src=x onerror=alert(1)>Safe text"}}'
    );

    const cleaned = sanitizer.sanitizeValue(dirtyInput);

    assert.equal(cleaned.name, 'Chidi');
    assert.equal(Object.prototype.hasOwnProperty.call(cleaned, '$where'), false);
    assert.equal(({}).polluted, undefined);
    assert.ok(!cleaned.nested.note.includes('onerror'));
    assert.ok(cleaned.nested.note.includes('Safe text'));
  });

  it('IdorProtection strips mass-assignment privilege & financial fields from untrusted requests', () => {
    const middleware = IdorProtection.preventMassAssignmentAndTraversal();
    const req = {
      params: { id: 'ROF-849102' },
      body: {
        customer: { name: 'Chidi' },
        role: 'Owner',
        isAdmin: true,
        subtotal: 1,
        total: 1,
        fee: 0,
        discount: 999999,
        payment: { method: 'paystack', status: 'paid' },
      },
    };

    let nextCalled = false;
    middleware(req, {}, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.body.role, undefined);
    assert.equal(req.body.isAdmin, undefined);
    assert.equal(req.body.subtotal, undefined);
    assert.equal(req.body.total, undefined);
    assert.equal(req.body.payment.status, undefined);
    assert.equal(req.body.payment.method, 'paystack');
  });

  it('IdorProtection blocks path traversal in route parameters', () => {
    const middleware = IdorProtection.preventMassAssignmentAndTraversal();
    const req = {
      params: { id: '../../etc/passwd' },
      body: {},
    };

    assert.throws(
      () => middleware(req, {}, () => {}),
      (err) => Boolean(err.code === 'IDOR_VIOLATION' && err.statusCode === 403)
    );
  });

  it('Cryptographic Order Ownership Token prevents horizontal IDOR across orders', () => {
    const tokenForOrder1 = cryptoService.generateOrderAccessToken(
      'ROF-849102',
      'chidi.okafor@gmail.com',
      '+234 803 234 5678'
    );

    assert.equal(
      cryptoService.verifyOrderAccessToken(
        tokenForOrder1,
        'ROF-849102',
        'chidi.okafor@gmail.com',
        '+234 803 234 5678'
      ),
      true
    );

    assert.equal(
      cryptoService.verifyOrderAccessToken(
        tokenForOrder1,
        'ROF-742918',
        'amina.d@outlook.com',
        '+234 812 345 6789'
      ),
      false
    );
  });

  it('CloudinaryService uploads product images and ProductService saves Cloudinary URLs in product', async () => {
    const store = {};
    const mockProductRepo = {
      async findById(id) {
        return store[id] || null;
      },
      async findBySlugOrId(slugOrId) {
        return (
          store[slugOrId] ||
          Object.values(store).find((p) => p.slug === slugOrId) ||
          null
        );
      },
      async save(productData) {
        store[productData.id] = { ...productData };
        return store[productData.id];
      },
      async saveProductImages(productId, uploadedAssets, { replace = false } = {}) {
        const existing = store[productId];
        const newUrls = uploadedAssets.map((a) => a.url);
        existing.images = replace ? newUrls : [...existing.images, ...newUrls];
        existing.cloudinaryImages = replace
          ? uploadedAssets
          : [...(existing.cloudinaryImages || []), ...uploadedAssets];
        existing.thumbnailUrl = existing.images[0];
        return existing;
      },
      async removeProductImage(productId, { publicId, url }) {
        const existing = store[productId];
        existing.cloudinaryImages = (existing.cloudinaryImages || []).filter(
          (a) => a.publicId !== publicId && a.url !== url
        );
        existing.images = (existing.images || []).filter((u) => u !== url);
        return existing;
      },
    };

    const cloudinaryService = new CloudinaryService({
      cloudName: 'rof-rage-studio',
      apiKey: '',
      apiSecret: '',
      folder: 'rof_rage/products',
    });

    const productService = new ProductService(
      mockProductRepo,
      { async logAction() {} },
      cloudinaryService
    );

    const base64Image1 = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
    const base64Image2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const saveDto = new SaveProductRequestDTO({
      id: 'prod-cloud-1',
      name: 'Lagos Night Heavy Hoodie',
      categoryName: 'Limited Archive Editions',
      colour: 'Obsidian Black',
      print: 'High-density puff print crest',
      price: 45000,
      blurb: 'Crafted from 480GSM loopback cotton in Lagos.',
      imageFiles: [base64Image1],
      variants: [{ size: 'L', stock: 15 }],
    });

    // 1. Save product with base64 image -> uploads to Cloudinary and saves URL in product.images
    const savedProduct = await productService.saveProduct(saveDto, 'Owner');

    assert.equal(savedProduct.id, 'prod-cloud-1');
    assert.equal(savedProduct.categorySlug, 'limited-archive-editions');
    assert.equal(savedProduct.images.length, 1);
    assert.ok(
      savedProduct.images[0].startsWith(
        'https://res.cloudinary.com/rof-rage-studio/image/upload/'
      )
    );
    assert.equal(savedProduct.thumbnailUrl, savedProduct.images[0]);
    assert.equal(savedProduct.cloudinaryImages.length, 1);
    assert.ok(savedProduct.cloudinaryImages[0].publicId.includes('rof_rage/products/'));

    // 2. Upload additional image to existing product and save URL
    const uploadResult = await productService.uploadProductImages(
      'prod-cloud-1',
      [base64Image2],
      { replace: false, actorName: 'Owner' }
    );

    assert.equal(uploadResult.product.images.length, 2);
    assert.equal(uploadResult.product.cloudinaryImages.length, 2);
    assert.ok(uploadResult.uploadedImages[0].url.includes('res.cloudinary.com'));

    // 3. Delete second image from product & Cloudinary
    const secondAsset = uploadResult.uploadedImages[0];
    const afterRemove = await productService.deleteProductImage(
      'prod-cloud-1',
      { publicId: secondAsset.publicId, url: secondAsset.url },
      'Owner'
    );
    assert.equal(afterRemove.images.length, 1);
    assert.equal(afterRemove.cloudinaryImages.length, 1);
  });

  it('CategoryService powers Category Page with Cloudinary banner, facet filters, and paginated products', async () => {
    const categories = {
      'cat-heavyweight-tees': {
        id: 'cat-heavyweight-tees',
        name: 'Heavyweight Tees',
        slug: 'heavyweight-tees',
        headline: 'Boxy 320GSM Studio Silhouettes',
        description: 'Signature dropped-shoulder heavyweight cotton tees.',
        bannerImage: 'https://res.cloudinary.com/rof-rage-studio/image/upload/v1/banner.webp',
        featured: true,
        active: true,
        position: 1,
      },
    };

    const sampleProducts = [
      {
        id: 'prod-1',
        slug: 'destined-cards-tee',
        name: 'Destined Cards Tee',
        categoryId: 'cat-heavyweight-tees',
        categorySlug: 'heavyweight-tees',
        categoryName: 'Heavyweight Tees',
        colour: 'Forest green',
        colourKey: 'green',
        swatch: '#1b382b',
        print: 'Cards print',
        price: 30000,
        blurb: 'Forest green tee',
        images: ['https://res.cloudinary.com/rof-rage-studio/image/upload/v1/prod-1.webp'],
        published: true,
        variants: [{ size: 'M', stock: 10 }, { size: 'L', stock: 12 }],
      },
      {
        id: 'prod-2',
        slug: 'rage-wave-tee-white',
        name: 'Rage Wave Tee',
        categoryId: 'cat-heavyweight-tees',
        categorySlug: 'heavyweight-tees',
        categoryName: 'Heavyweight Tees',
        colour: 'White',
        colourKey: 'white',
        swatch: '#f4f3ef',
        print: 'Wave print',
        price: 25000,
        blurb: 'White tee',
        images: ['https://res.cloudinary.com/rof-rage-studio/image/upload/v1/prod-2.webp'],
        published: true,
        variants: [{ size: 'S', stock: 5 }, { size: 'L', stock: 8 }],
      },
    ];

    const mockCategoryRepo = {
      async findAllCategories() {
        return Object.values(categories);
      },
      async findBySlugOrId(slugOrId) {
        return (
          categories[slugOrId] ||
          Object.values(categories).find((c) => c.slug === slugOrId) ||
          null
        );
      },
      async findById(id) {
        return categories[id] || null;
      },
      async save(cat) {
        categories[cat.id] = cat;
        return cat;
      },
    };

    const mockProductRepo = {
      async findAll() {
        return sampleProducts;
      },
      buildCatalogFilter() {
        return { categorySlug: 'heavyweight-tees', published: true };
      },
      async findPaginated() {
        return {
          data: sampleProducts,
          meta: { page: 1, limit: 20, totalItems: 2, totalPages: 1 },
        };
      },
      async getCategoryFacets() {
        return {
          totalPieces: 2,
          availableSizes: ['S', 'M', 'L'],
          availableColours: [
            { colourKey: 'green', colour: 'Forest green', swatch: '#1b382b' },
            { colourKey: 'white', colour: 'White', swatch: '#f4f3ef' },
          ],
          priceRange: { min: 25000, max: 30000 },
        };
      },
    };

    const categoryService = new CategoryService(
      mockCategoryRepo,
      mockProductRepo,
      { async logAction() {} },
      new CloudinaryService()
    );

    const allCats = await categoryService.getCategories();
    assert.equal(allCats.length, 1);
    assert.equal(allCats[0].productCount, 2);

    const page = await categoryService.getCategoryPage('heavyweight-tees', { page: 1, limit: 20 });
    assert.equal(page.category.slug, 'heavyweight-tees');
    assert.equal(page.facets.totalPieces, 2);
    assert.deepEqual(page.facets.availableSizes, ['S', 'M', 'L']);
    assert.equal(page.facets.priceRange.min, 25000);
    assert.equal(page.facets.priceRange.max, 30000);
    assert.equal(page.products.length, 2);

    // Save new category with base64 banner image uploaded to Cloudinary
    const newCatDto = new SaveCategoryRequestDTO({
      name: 'Outerwear Jackets',
      headline: 'Structured Lagos Outerwear',
      description: 'Heavy canvas and technical shells',
      bannerImage: 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=',
    });
    const savedCat = await categoryService.saveCategory(newCatDto, 'Owner');
    assert.equal(savedCat.slug, 'outerwear-jackets');
    assert.ok(savedCat.bannerImage.includes('res.cloudinary.com/'));
  });

  it('ReviewService & WishlistService support verified purchase reviews and customer saved pieces', async () => {
    const sampleProduct = {
      id: 'prod-1',
      slug: 'destined-cards-tee',
      name: 'Destined Cards Tee',
      colour: 'Forest green',
      price: 30000,
      print: 'Cards',
      blurb: 'Blurb',
      published: true,
      ratingAverage: 0,
      reviewCount: 0,
      variants: [{ size: 'L', stock: 10 }],
    };

    const reviews = [];
    const mockReviewRepo = {
      async findByUserAndProduct(userId, productId) {
        return reviews.find((r) => r.userId === userId && r.productId === productId) || null;
      },
      async create(doc) {
        reviews.push(doc);
        return doc;
      },
      async computeProductRatingStats() {
        return { ratingAverage: 5, reviewCount: reviews.length };
      },
    };

    const mockProductRepo = {
      async findBySlugOrId() {
        return sampleProduct;
      },
      async findByIds() {
        return [sampleProduct];
      },
      async updateRatingSummary(_id, stats) {
        sampleProduct.ratingAverage = stats.ratingAverage;
        sampleProduct.reviewCount = stats.reviewCount;
        return sampleProduct;
      },
    };

    const mockOrderRepo = {
      async findPaginatedByUser() {
        return {
          data: [
            {
              id: 'ROF-849102',
              status: 'delivered',
              items: [{ productId: 'prod-1', size: 'L', qty: 1 }],
            },
          ],
        };
      },
    };

    const reviewService = new ReviewService(
      mockReviewRepo,
      mockProductRepo,
      mockOrderRepo,
      { async logAction() {} }
    );

    const createdReview = await reviewService.createReview(
      'destined-cards-tee',
      { rating: 5, title: 'Incredible quality', comment: 'Heavyweight cotton is top tier.' },
      { id: 'user-cust-1', name: 'Chidi Okafor', email: 'chidi@gmail.com' }
    );

    assert.equal(createdReview.verifiedPurchase, true);
    assert.equal(createdReview.rating, 5);
    assert.equal(sampleProduct.ratingAverage, 5);
    assert.equal(sampleProduct.reviewCount, 1);

    // Wishlist toggle test
    let wishlistIds = [];
    const mockWishlistRepo = {
      async findByUserId(userId) {
        return { id: `wish-${userId}`, userId, productIds: wishlistIds };
      },
      async addProduct(userId, prodId) {
        wishlistIds.push(prodId);
        return { id: `wish-${userId}`, userId, productIds: wishlistIds };
      },
      async removeProduct(userId, prodId) {
        wishlistIds = wishlistIds.filter((id) => id !== prodId);
        return { id: `wish-${userId}`, userId, productIds: wishlistIds };
      },
    };

    const wishlistService = new WishlistService(
      mockWishlistRepo,
      mockProductRepo,
      { async logAction() {} }
    );

    const toggledOn = await wishlistService.toggleProduct(
      { id: 'user-cust-1' },
      'destined-cards-tee'
    );
    assert.equal(toggledOn.added, true);
    assert.equal(toggledOn.wishlist.count, 1);
  });

  it('DTOs enforce Interface Segregation: PublicOrderResponseDTO hides internalNotes while AdminOrderResponseDTO exposes it, and OrderTrackingResponseDTO builds 5-stage timeline', () => {
    const rawOrder = {
      id: 'ROF-849102',
      userId: 'user-customer-1',
      customer: {
        name: 'Chidi',
        phone: '+2348032345678',
        email: 'chidi@gmail.com',
        address: '14 Admiralty Way',
        city: 'Lagos',
        state: 'Lagos',
      },
      items: [],
      subtotal: 30000,
      fee: 2500,
      discount: 0,
      total: 32500,
      payment: { method: 'paystack', status: 'paid', reference: 'ref_1' },
      status: 'out_for_delivery',
      trackingNumber: 'GIGL-99281',
      courier: 'GIG Logistics',
      internalNotes: 'CONFIDENTIAL STAFF NOTE',
      createdAt: '2026-11-08T09:15:00Z',
      history: [{ status: 'received', timestamp: '2026-11-08T09:15:00Z', note: 'Order placed' }],
    };

    const publicDto = PublicOrderResponseDTO.fromEntity(rawOrder);
    const adminDto = AdminOrderResponseDTO.fromEntity(rawOrder);
    const trackingDto = OrderTrackingResponseDTO.fromEntity(rawOrder);

    assert.equal(publicDto.internalNotes, undefined);
    assert.equal(adminDto.internalNotes, 'CONFIDENTIAL STAFF NOTE');
    assert.equal(BaseDTO.pick(rawOrder, ['id', 'total']).internalNotes, undefined);

    assert.equal(trackingDto.tracking.progressPercentage, 80);
    assert.equal(trackingDto.tracking.steps.length, 5);
    assert.equal(trackingDto.tracking.trackingNumber, 'GIGL-99281');
    assert.equal(trackingDto.tracking.courier, 'GIG Logistics');
    assert.equal(trackingDto.tracking.steps[3].status, 'out_for_delivery');
    assert.equal(trackingDto.tracking.steps[3].active, true);
  });

  it('Admin Login allows Owner/Staff and rejects Customer accounts from Admin Studio', async () => {
    const ownerHash = cryptoService.hashPassword('ownerpass123');
    const customerHash = cryptoService.hashPassword('customerpass123');

    const mockUsers = {
      'admin@rofrage.com': {
        id: 'user-owner',
        name: 'Tunde ROF',
        email: 'admin@rofrage.com',
        role: 'Owner',
        active: true,
        passwordHash: ownerHash,
      },
      'chidi@gmail.com': {
        id: 'user-cust-1',
        name: 'Chidi Okafor',
        email: 'chidi@gmail.com',
        role: 'Customer',
        active: true,
        passwordHash: customerHash,
      },
    };

    const mockUserRepo = {
      async findByEmail(email) {
        return mockUsers[email.toLowerCase()] || null;
      },
      async updateLastLogin(id) {
        return { id };
      },
    };

    const mockAuditService = {
      async logAction() {},
    };

    const authService = new AuthService(mockUserRepo, mockAuditService);
    const adminService = new AdminService({
      productRepository: {},
      orderRepository: {},
      userRepository: mockUserRepo,
      messageRepository: {},
      discountRepository: {},
      auditService: mockAuditService,
      authService,
    });

    const adminSession = await adminService.login({
      email: 'admin@rofrage.com',
      password: 'ownerpass123',
    });
    assert.equal(adminSession.user.role, 'Owner');
    assert.ok(adminSession.token);

    await assert.rejects(
      async () =>
        adminService.login({
          email: 'chidi@gmail.com',
          password: 'customerpass123',
        }),
      (err) => Boolean(err.statusCode === 403 && err.code === 'FORBIDDEN')
    );

    const customerSession = await authService.login({
      email: 'chidi@gmail.com',
      password: 'customerpass123',
    });
    assert.equal(customerSession.user.role, 'Customer');
    assert.equal(customerSession.user.id, 'user-cust-1');
    assert.ok(customerSession.token);
  });

  it('PaymentService requires customer login before initializing payment and binds userId to order', async () => {
    const orderStore = {
      'ROF-555111': {
        id: 'ROF-555111',
        userId: null,
        total: 32500,
        customer: {
          name: 'Chidi Okafor',
          email: 'chidi@gmail.com',
          phone: '+2348032345678',
          address: '14 Admiralty Way',
          city: 'Lagos',
          state: 'Lagos',
        },
        payment: { method: 'paystack', status: 'pending', reference: '' },
      },
    };

    const mockOrderRepo = {
      async findById(id) {
        return orderStore[id] || null;
      },
      async updateById(id, patch) {
        orderStore[id] = { ...orderStore[id], ...patch };
        return orderStore[id];
      },
    };

    const paymentService = new PaymentService(mockOrderRepo, { async logAction() {} });

    await assert.rejects(
      async () => paymentService.initializePayment({ orderId: 'ROF-555111', method: 'paystack' }, null),
      (err) => Boolean(err.statusCode === 401 && err.code === 'UNAUTHORIZED')
    );

    await assert.rejects(
      async () =>
        paymentService.initializePayment(
          { orderId: 'ROF-555111', method: 'paystack' },
          { id: 'user-cust-2', email: 'other@gmail.com', role: 'Customer' }
        ),
      (err) => Boolean(err.statusCode === 403 && err.code === 'IDOR_VIOLATION')
    );

    const initResult = await paymentService.initializePayment(
      { orderId: 'ROF-555111', method: 'paystack' },
      { id: 'user-cust-1', email: 'chidi@gmail.com', role: 'Customer' }
    );

    assert.equal(initResult.orderId, 'ROF-555111');
    assert.ok(initResult.reference.startsWith('pstk_ref_'));
    assert.equal(orderStore['ROF-555111'].userId, 'user-cust-1');
  });

  it('OrderService tracks order with 5-stage timeline and enforces IDOR between different customers', async () => {
    const sampleOrder = {
      id: 'ROF-849102',
      userId: 'user-cust-1',
      customer: {
        name: 'Chidi Okafor',
        phone: '+234 803 234 5678',
        email: 'chidi@gmail.com',
        address: '14 Admiralty Way',
        city: 'Lagos',
        state: 'Lagos',
      },
      items: [{ productId: 'prod-1', name: 'Eko Oversized Heavy Tee', size: 'L', qty: 1, unitPrice: 28000 }],
      subtotal: 28000,
      fee: 2500,
      discount: 0,
      total: 30500,
      payment: { method: 'paystack', status: 'paid', reference: 'ref_1' },
      status: 'confirmed',
      createdAt: '2026-11-08T09:15:00Z',
      history: [
        { status: 'received', timestamp: '2026-11-08T09:15:00Z', note: 'Order placed' },
        { status: 'confirmed', timestamp: '2026-11-08T09:20:00Z', note: 'Payment verified' },
      ],
    };

    const mockOrderRepo = {
      async findById(id) {
        return id === 'ROF-849102' ? sampleOrder : null;
      },
      async findByIdAndCustomerContact(orderId, contact, authenticatedUserId) {
        if (orderId !== 'ROF-849102') return { order: null, ownershipValid: false };
        const byUserId = authenticatedUserId && sampleOrder.userId === authenticatedUserId;
        const byEmail = contact && sampleOrder.customer.email.toLowerCase() === contact.toLowerCase();
        return {
          order: sampleOrder,
          ownershipValid: Boolean(byUserId || byEmail),
        };
      },
      async attachUserToGuestOrders() {
        return 1;
      },
      async findPaginatedByUser(userId) {
        return {
          data: userId === 'user-cust-1' ? [sampleOrder] : [],
          meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
        };
      },
    };

    const orderService = new OrderService({
      orderRepository: mockOrderRepo,
      productRepository: {},
      contentRepository: {},
      discountService: {},
      idempotencyRepository: {},
      auditService: { async logAction() {} },
    });

    const trackedByOwner = await orderService.trackOrder(
      { orderId: 'ROF-849102' },
      { id: 'user-cust-1', email: 'chidi@gmail.com', role: 'Customer' }
    );
    assert.equal(trackedByOwner.id, 'ROF-849102');
    assert.equal(trackedByOwner.status, 'confirmed');
    assert.equal(trackedByOwner.tracking.progressPercentage, 40);

    await assert.rejects(
      async () =>
        orderService.trackOrder(
          { orderId: 'ROF-849102', contact: 'attacker@evil.com' },
          { id: 'user-cust-2', email: 'attacker@evil.com', role: 'Customer' }
        ),
      (err) => Boolean(err.statusCode === 403 && err.code === 'IDOR_VIOLATION')
    );

    const myOrders = await orderService.getMyOrders(
      { id: 'user-cust-1', email: 'chidi@gmail.com', role: 'Customer' },
      { page: 1, limit: 20 }
    );
    assert.equal(myOrders.data.length, 1);
    assert.equal(myOrders.data[0].id, 'ROF-849102');
    assert.equal(myOrders.data[0].tracking.steps.length, 5);
  });

  it('MessageService supports customer inquiry creation, customer message inbox, admin reply, and IDOR protection', async () => {
    const store = {};
    const mockMessageRepo = {
      async create(doc) {
        store[doc.id] = { ...doc, replies: [] };
        return store[doc.id];
      },
      async findById(id) {
        return store[id] || null;
      },
      async addReply(id, reply) {
        if (!store[id]) return null;
        store[id].replies.push(reply);
        store[id].handled = true;
        return store[id];
      },
      async findPaginatedByUser(userId) {
        const list = Object.values(store).filter((m) => m.userId === userId);
        return {
          data: list,
          meta: { page: 1, limit: 20, totalItems: list.length, totalPages: 1 },
        };
      },
    };

    const messageService = new MessageService(mockMessageRepo, { async logAction() {} });

    const createDto = new CreateMessageRequestDTO(
      {
        name: 'Chidi Okafor',
        email: 'chidi@gmail.com',
        phone: '+2348032345678',
        subject: 'Order Status Inquiry',
        orderId: 'ROF-849102',
        message: 'Hello, when will my order ROF-849102 be dispatched?',
      },
      { id: 'user-cust-1', email: 'chidi@gmail.com', role: 'Customer' }
    );

    const created = await messageService.createMessage(createDto);

    assert.equal(created.userId, 'user-cust-1');
    assert.equal(created.orderId, 'ROF-849102');

    const replyDto = new ReplyMessageRequestDTO(
      { replyText: 'Your order has been handed to GIG Logistics today!' },
      { id: 'user-owner', name: 'Tunde ROF', role: 'Owner' }
    );
    const replied = await messageService.replyToMessage(created.id, replyDto);
    assert.equal(replied.replies.length, 1);
    assert.equal(replied.replies[0].senderName, 'Tunde ROF');
    assert.equal(replied.handled, true);

    await assert.rejects(
      async () =>
        messageService.getMessageById(created.id, {
          id: 'user-cust-2',
          email: 'other@gmail.com',
          role: 'Customer',
        }),
      (err) => Boolean(err.statusCode === 403 && err.code === 'IDOR_VIOLATION')
    );
  });

  it('Paginator builds MongoDB filters, sorts, and pagination metadata accurately', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({
      id: `item-${i + 1}`,
      name: `Piece ${i + 1}`,
      price: (i + 1) * 1000,
    }));

    const page2 = Paginator.paginateArray(items, { page: 2, limit: 10, sortBy: 'price', sortOrder: 'desc' });

    assert.equal(page2.data.length, 10);
    assert.equal(page2.meta.page, 2);
    assert.equal(page2.meta.totalItems, 25);
    assert.equal(page2.meta.totalPages, 3);
    assert.equal(page2.meta.hasNextPage, true);
    assert.equal(page2.meta.hasPrevPage, true);
    assert.equal(page2.data[0].price, 15000);
  });

  it('Validators enforce domain rules for Products, Categories, Reviews, Orders, Auth, and Messages', () => {
    assert.throws(
      () => ProductValidator.validateSaveProduct({ name: 'A', price: -500 }),
      (err) =>
        Boolean(
          err.statusCode === 400 &&
            err.code === 'VALIDATION_ERROR' &&
            err.details.name &&
            err.details.price
        )
    );

    assert.throws(
      () => CategoryValidator.validateSaveCategory({ name: 'X' }),
      (err) => Boolean(err.statusCode === 400 && err.details.name)
    );

    assert.throws(
      () => ReviewValidator.validateCreateReview({ rating: 9, comment: 'No' }),
      (err) => Boolean(err.statusCode === 400 && err.details.rating && err.details.comment)
    );

    assert.throws(
      () => OrderValidator.validateCreateOrder({ customer: {}, items: [] }),
      (err) => Boolean(err.statusCode === 400 && err.details.items)
    );

    assert.throws(
      () => AuthValidator.validateRegister({ name: 'A', email: 'bad', password: '123' }),
      (err) => Boolean(err.statusCode === 400 && err.details.email && err.details.password)
    );

    assert.throws(
      () => MessageValidator.validateReplyMessage({ replyText: '' }),
      (err) => Boolean(err.statusCode === 400 && err.details.replyText)
    );
  });

  it('Route-level TryCatchHandler catches async errors and forwards them to Express next(err)', async () => {
    const failingControllerAction = async () => {
      throw AppError.notFound('Product', 'prod-999');
    };

    const wrapped = TryCatchHandler.wrap(failingControllerAction);
    let capturedError = null;

    await wrapped({ method: 'GET', originalUrl: '/api/v1/products/prod-999' }, {}, (err) => {
      capturedError = err;
    });

    assert.ok(capturedError instanceof AppError);
    assert.equal(capturedError.statusCode, 404);
    assert.equal(capturedError.code, 'NOT_FOUND');
  });

  it('ResponseHandler formats standardized success, paginated, and error envelopes', () => {
    let statusCodeSet = null;
    let jsonPayload = null;
    const headersSet = {};

    const mockRes = {
      req: { query: {}, headers: {} },
      setHeader(k, v) {
        headersSet[k] = v;
      },
      status(code) {
        statusCodeSet = code;
        return this;
      },
      json(payload) {
        jsonPayload = payload;
        return payload;
      },
    };

    ResponseHandler.paginated(mockRes, {
      data: [{ id: 'prod-1' }],
      pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
      message: 'Products fetched',
    });

    assert.equal(statusCodeSet, 200);
    assert.equal(jsonPayload.success, true);
    assert.equal(headersSet['X-Total-Count'], '1');
    assert.equal(jsonPayload.pagination.totalItems, 1);
  });
});
