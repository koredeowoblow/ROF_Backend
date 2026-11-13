import { ProductRepository } from './repositories/product.repository.js';
import { CategoryRepository } from './repositories/category.repository.js';
import { ReviewRepository } from './repositories/review.repository.js';
import { WishlistRepository } from './repositories/wishlist.repository.js';
import { OrderRepository } from './repositories/order.repository.js';
import { UserRepository } from './repositories/user.repository.js';
import { DiscountRepository } from './repositories/discount.repository.js';
import { MessageRepository } from './repositories/message.repository.js';
import { ContentRepository } from './repositories/content.repository.js';
import { AuditRepository } from './repositories/audit.repository.js';
import { NewsletterRepository } from './repositories/newsletter.repository.js';
import { IdempotencyRepository } from './repositories/idempotency.repository.js';
import { SettingsRepository } from './repositories/settings.repository.js';

import { AuditService } from './services/audit.service.js';
import { CloudinaryService } from './services/cloudinary.service.js';
import { AuthService } from './services/auth.service.js';
import { ProductService } from './services/product.service.js';
import { CategoryService } from './services/category.service.js';
import { ReviewService } from './services/review.service.js';
import { WishlistService } from './services/wishlist.service.js';
import { DiscountService } from './services/discount.service.js';
import { ContentService } from './services/content.service.js';
import { OrderService } from './services/order.service.js';
import { PaymentService } from './services/payment.service.js';
import { MessageService } from './services/message.service.js';
import { NewsletterService } from './services/newsletter.service.js';
import { AdminService } from './services/admin.service.js';

import { AuthController } from './controllers/auth.controller.js';
import { ProductController } from './controllers/product.controller.js';
import { CategoryController } from './controllers/category.controller.js';
import { ReviewController } from './controllers/review.controller.js';
import { WishlistController } from './controllers/wishlist.controller.js';
import { OrderController } from './controllers/order.controller.js';
import { DiscountController } from './controllers/discount.controller.js';
import { MessageController } from './controllers/message.controller.js';
import { ContentController } from './controllers/content.controller.js';
import { NewsletterController } from './controllers/newsletter.controller.js';
import { PaymentController } from './controllers/payment.controller.js';
import { AdminController } from './controllers/admin.controller.js';

/**
 * Dependency Injection Container (SOLID - Dependency Inversion Principle)
 * Wires together Repositories -> Services -> Controllers cleanly.
 * Accepts optional custom repository overrides for isolated testing.
 */
export class Container {
  constructor(overrides = {}) {
    // 1. Repositories (Data Access Layer)
    this.repositories = {
      product: overrides.productRepository || new ProductRepository(),
      category: overrides.categoryRepository || new CategoryRepository(),
      review: overrides.reviewRepository || new ReviewRepository(),
      wishlist: overrides.wishlistRepository || new WishlistRepository(),
      order: overrides.orderRepository || new OrderRepository(),
      user: overrides.userRepository || new UserRepository(),
      discount: overrides.discountRepository || new DiscountRepository(),
      message: overrides.messageRepository || new MessageRepository(),
      content: overrides.contentRepository || new ContentRepository(),
      audit: overrides.auditRepository || new AuditRepository(),
      newsletter: overrides.newsletterRepository || new NewsletterRepository(),
      idempotency: overrides.idempotencyRepository || new IdempotencyRepository(),
      settings: overrides.settingsRepository || new SettingsRepository(),
    };

    // 2. Services (Business Logic Layer)
    const auditService = new AuditService(this.repositories.audit);
    const cloudinaryService = overrides.cloudinaryService || new CloudinaryService();
    const discountService = new DiscountService(this.repositories.discount, auditService);
    const authService = new AuthService(
      this.repositories.user,
      auditService,
      this.repositories.order
    );

    this.services = {
      audit: auditService,
      cloudinary: cloudinaryService,
      auth: authService,
      product: new ProductService(this.repositories.product, auditService, cloudinaryService),
      category: new CategoryService(
        this.repositories.category,
        this.repositories.product,
        auditService,
        cloudinaryService
      ),
      review: new ReviewService(
        this.repositories.review,
        this.repositories.product,
        this.repositories.order,
        auditService
      ),
      wishlist: new WishlistService(
        this.repositories.wishlist,
        this.repositories.product,
        auditService
      ),
      discount: discountService,
      content: new ContentService(this.repositories.content, auditService),
      order: new OrderService({
        orderRepository: this.repositories.order,
        productRepository: this.repositories.product,
        contentRepository: this.repositories.content,
        discountService,
        idempotencyRepository: this.repositories.idempotency,
        auditService,
      }),
      payment: new PaymentService(this.repositories.order, auditService),
      message: new MessageService(this.repositories.message, auditService),
      newsletter: new NewsletterService(this.repositories.newsletter, auditService),
      admin: new AdminService({
        orderRepository: this.repositories.order,
        productRepository: this.repositories.product,
        messageRepository: this.repositories.message,
        settingsRepository: this.repositories.settings,
        authService,
        auditService,
      }),
    };

    // 3. Controllers (HTTP Presentation Layer)
    this.controllers = {
      auth: new AuthController(this.services.auth),
      product: new ProductController(this.services.product),
      category: new CategoryController(this.services.category),
      review: new ReviewController(this.services.review),
      wishlist: new WishlistController(this.services.wishlist),
      order: new OrderController(this.services.order),
      discount: new DiscountController(this.services.discount),
      message: new MessageController(this.services.message),
      content: new ContentController(this.services.content),
      newsletter: new NewsletterController(this.services.newsletter),
      payment: new PaymentController(this.services.payment),
      admin: new AdminController(this.services.admin, this.services.audit),
    };
  }
}
