# ROF RAGE — Luxury Streetwear Backend API (MongoDB + Class-Based SOLID/DRY Architecture)

Production-ready Node.js (ES Modules) + Express + MongoDB (Mongoose) backend for the **ROF RAGE** Lagos luxury streetwear storefront and Admin Studio.

---

## Architectural Highlights

1. **100% Class-Based Layered Architecture**:
   - **Core Base Classes (`src/core/`)**: `AppError`, `BaseDTO`, `BaseValidator`, `BaseRepository`, `BaseService`, `BaseController`.
   - **Controllers (`src/controllers/`)**: `AuthController`, `AdminController`, `ProductController`, `CategoryController`, `ReviewController`, `WishlistController`, `OrderController`, `PaymentController`, `MessageController`, `DiscountController`, `ContentController`, `NewsletterController`.
   - **Services (`src/services/`)**: `AuthService`, `AdminService`, `CloudinaryService`, `ProductService`, `CategoryService`, `ReviewService`, `WishlistService`, `OrderService`, `PaymentService`, `MessageService`, `DiscountService`, `ContentService`, `NewsletterService`, `AuditService`.
   - **Repositories (`src/repositories/`)**: `UserRepository`, `ProductRepository`, `CategoryRepository`, `ReviewRepository`, `WishlistRepository`, `OrderRepository`, `MessageRepository`, `DiscountRepository`, `ContentRepository`, `AuditRepository`, `NewsletterRepository`, `IdempotencyRepository`, `SettingsRepository`.
   - **DTOs (`src/dtos/`) & Validators (`src/validators/`)**: Strict input/output projection and validation per domain.
2. **Route-Level `TryCatchHandler` Only**:
   - Located in `src/middlewares/tryCatchHandler.js` (`routeTryCatch` / `TryCatchHandler.wrap`).
   - Controllers, Services, and Repositories contain zero `try/catch` clutter; all synchronous or asynchronous throws automatically bubble up through the route-level wrapper to `ErrorHandler.handle`.
3. **Unified `ResponseHandler`**:
   - Class-based response formatter (`src/utils/responseHandler.js`) providing `.success()`, `.created()`, `.paginated()`, `.noContent()`, and `.error()` envelopes.
4. **Request Sanitizer & IDOR Protection**:
   - `RequestSanitizer` (`src/middlewares/requestSanitizer.js`): Strips `<script>`/XSS payloads, inline event handlers, `__proto__` prototype pollution, and MongoDB `$` operator injection.
   - `IdorProtection` (`src/middlewares/idorProtection.js`): Strips mass-assignment fields (`role`, `isAdmin`, `subtotal`, `total`, `fee`, `discount`, `payment.status`), blocks path traversal, and enforces cryptographic + user-session ownership checks on orders, payments, messages, reviews, wishlists, and profiles.

---

## Key Workflows

### 1. Cloudinary Product Images & Media Management
- `POST /api/v1/products` & `PUT /api/v1/products/:id` (also `/api/v1/admin/products`): Accepts `multipart/form-data` binary files or JSON `imageFiles` / base64 data URIs via `UploadMiddleware.parseImages()`. Automatically uploads images to **Cloudinary** via `CloudinaryService` and saves the returned Cloudinary `secure_url`s in `product.images`, `product.cloudinaryImages`, and `product.thumbnailUrl`.
- `POST /api/v1/products/:id/images` (and `POST /api/v1/admin/products/:id/images`): Uploads one or multiple images to Cloudinary and appends or replaces (`?replace=true`) their URLs in the product document.
- `DELETE /api/v1/products/:id/images` (and `DELETE /api/v1/admin/products/:id/images`): Deletes an image from Cloudinary by `publicId` and removes its URL from the product in MongoDB.
- `POST /api/v1/admin/upload` & `GET /api/v1/admin/upload/signature`: Standalone Cloudinary media upload and signed upload parameters for the Admin Studio.

### 2. Category Page & Collections (`/api/v1/categories`)
- `GET /api/v1/categories` — Lists all active categories (`Heavyweight Tees`, `Limited Archive Editions`, `Monochrome Twin Sets`, etc.) enriched with live `productCount`.
- `GET /api/v1/categories/:slug` & `GET /api/v1/categories/:slug/products` — Full **Category Page** endpoint returning:
  - `category`: Category metadata, headline, description, and Cloudinary `bannerImage` URL.
  - `facets`: `{ totalPieces, availableSizes, availableColours, priceRange: { min, max } }`.
  - `products`: Paginated products filtered by `colourKey`, `size`, `minPrice`, `maxPrice`, `inStock`, `featured`, `tag`, `search`, and `sortBy`.
  - Also supports virtual collection slugs (`/api/v1/categories/all`, `/api/v1/categories/featured`, `/api/v1/categories/new-arrivals`).
- `POST /api/v1/categories`, `PUT /api/v1/categories/:id`, `DELETE /api/v1/categories/:id` (and `/api/v1/admin/categories`) — Admin category management with automatic Cloudinary banner upload.

### 3. Verified Product Reviews, Ratings, Wishlist & Related Products
- `GET /api/v1/products/:slug/related` — Returns the paired twin piece (`pairId`) and same-category recommendations.
- `GET /api/v1/products/:slug/reviews` & `POST /api/v1/products/:slug/reviews` — Verified customer product reviews (1–5 stars), automatically checking `OrderRepository` to mark `verifiedPurchase: true` and recalculating `ratingAverage` and `reviewCount` on the product.
- `GET /api/v1/wishlist`, `POST /api/v1/wishlist/:productId`, `DELETE /api/v1/wishlist/:productId`, `POST /api/v1/wishlist/:productId/toggle` — Logged-in customer saved pieces / wishlist.

### 4. Admin Login, Customer Login Before Payment, Order Tracking & Messages
- `POST /api/v1/admin/login` & `POST /api/v1/admin/logout` — Admin Studio login (`Owner`/`Staff` only).
- `POST /api/v1/auth/register` & `POST /api/v1/auth/login` — Customer registration and login before payment.
- `POST /api/v1/payments/paystack/initialize` — Requires customer authentication and binds `userId` to the order.
- `POST /api/v1/orders/track`, `GET /api/v1/orders/track/:id`, `GET /api/v1/orders/my-orders` — 5-stage Order Tracking timeline (`OrderTrackingResponseDTO`).
- `POST /api/v1/messages`, `GET /api/v1/messages/my-messages`, `POST /api/v1/admin/messages/:id/reply` — Customer & Admin messaging.
