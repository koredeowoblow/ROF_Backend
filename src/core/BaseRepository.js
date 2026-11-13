import mongoose from 'mongoose';
import { Paginator } from '../utils/pagination.js';

/**
 * Abstract Base MongoDB/Mongoose Repository (SOLID - SRP, OCP, LSP, DIP & DRY)
 * Clean async data access methods without repetitive try/catch blocks
 * (errors bubble directly to the route-level TryCatchHandler).
 */
export class BaseRepository {
  /**
   * @param {import('mongoose').Model} model - Mongoose Model
   * @param {string} [primaryKey='id'] - Custom business identifier field alongside MongoDB '_id'
   */
  constructor(model, primaryKey = 'id') {
    if (new.target === BaseRepository) {
      throw new Error('BaseRepository is abstract and cannot be instantiated directly');
    }
    this.model = model;
    this.primaryKey = primaryKey;
  }

  /**
   * Build a query that matches either the domain primaryKey (e.g. 'ROF-849102', 'prod-1')
   * or a valid 24-hex MongoDB ObjectId (_id).
   */
  buildIdFilter(id) {
    const cleanId = String(id || '').trim();
    if (mongoose.Types.ObjectId.isValid(cleanId) && /^[0-9a-fA-F]{24}$/.test(cleanId)) {
      return { $or: [{ [this.primaryKey]: cleanId }, { _id: cleanId }] };
    }
    return { [this.primaryKey]: cleanId };
  }

  /**
   * Normalize a Mongoose document or lean object into a clean plain object with `id`
   */
  normalizeDoc(doc) {
    if (!doc) return null;
    const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
    if (!plain[this.primaryKey] && plain._id) {
      plain[this.primaryKey] = String(plain._id);
    }
    delete plain.__v;
    return plain;
  }

  normalizeDocs(docs = []) {
    return Array.isArray(docs) ? docs.map((d) => this.normalizeDoc(d)) : [];
  }

  /**
   * Retrieve all documents matching a MongoDB filter
   */
  async findAll(filter = {}, sort = { createdAt: -1 }) {
    const docs = await this.model.find(filter).sort(sort).lean().exec();
    return this.normalizeDocs(docs);
  }

  /**
   * Retrieve paginated documents directly from MongoDB using skip/limit & countDocuments
   */
  async findPaginated(
    paginationOptions = {},
    { filter = {}, searchFields = [], defaultSort = { createdAt: -1 } } = {}
  ) {
    const parsed = Paginator.parseOptions(paginationOptions);
    const mongoFilter = Paginator.buildMongoFilter(filter, parsed.search, searchFields);
    const mongoSort = Paginator.buildMongoSort(parsed, defaultSort);

    const totalItems = await this.model.countDocuments(mongoFilter).exec();
    const meta = Paginator.buildMeta({
      totalItems,
      page: parsed.page,
      limit: parsed.limit,
    });
    const skip = (meta.page - 1) * meta.limit;

    const docs = await this.model
      .find(mongoFilter)
      .sort(mongoSort)
      .skip(skip)
      .limit(meta.limit)
      .lean()
      .exec();

    return {
      data: this.normalizeDocs(docs),
      meta,
    };
  }

  /**
   * Find a single document by primary key or MongoDB _id
   */
  async findById(id) {
    const doc = await this.model.findOne(this.buildIdFilter(id)).lean().exec();
    return this.normalizeDoc(doc);
  }

  /**
   * IDOR-safe scoped lookup: Find document by ID AND verify ownership/scope filter in MongoDB
   */
  async findByIdScoped(id, ownershipFilter = {}) {
    const baseDoc = await this.findById(id);
    if (!baseDoc) {
      return { record: null, ownershipValid: false };
    }

    if (typeof ownershipFilter === 'function') {
      const allowed = Boolean(ownershipFilter(baseDoc));
      return { record: allowed ? baseDoc : null, ownershipValid: allowed };
    }

    const scopedQuery = {
      $and: [this.buildIdFilter(id), ownershipFilter],
    };
    const scopedDoc = await this.model.findOne(scopedQuery).lean().exec();
    return {
      record: this.normalizeDoc(scopedDoc),
      ownershipValid: Boolean(scopedDoc),
    };
  }

  /**
   * Find first document matching a MongoDB filter object
   */
  async findOne(filter = {}) {
    const doc = await this.model.findOne(filter).lean().exec();
    return this.normalizeDoc(doc);
  }

  /**
   * Create and persist a new MongoDB document
   */
  async create(entity) {
    const created = await this.model.create(entity);
    return this.normalizeDoc(created);
  }

  /**
   * Update an existing document by ID (prevents PK mutation for IDOR safety)
   */
  async updateById(id, updates) {
    const safeUpdates = { ...updates };
    delete safeUpdates._id;
    delete safeUpdates[this.primaryKey];

    const updated = await this.model
      .findOneAndUpdate(
        this.buildIdFilter(id),
        { $set: safeUpdates },
        { new: true, runValidators: true }
      )
      .lean()
      .exec();

    return this.normalizeDoc(updated);
  }

  /**
   * IDOR-safe scoped update: Only updates if both ID and ownershipFilter match in MongoDB
   */
  async updateByIdScoped(id, ownershipFilter, updates) {
    const safeUpdates = { ...updates };
    delete safeUpdates._id;
    delete safeUpdates[this.primaryKey];

    const updated = await this.model
      .findOneAndUpdate(
        { $and: [this.buildIdFilter(id), ownershipFilter] },
        { $set: safeUpdates },
        { new: true, runValidators: true }
      )
      .lean()
      .exec();

    return this.normalizeDoc(updated);
  }

  /**
   * Upsert a document by primaryKey
   */
  async save(entity) {
    const id = entity[this.primaryKey];
    const updated = await this.model
      .findOneAndUpdate(
        this.buildIdFilter(id),
        { $set: entity },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
      )
      .lean()
      .exec();

    return this.normalizeDoc(updated);
  }

  /**
   * Delete a document by ID
   */
  async deleteById(id) {
    const deleted = await this.model.findOneAndDelete(this.buildIdFilter(id)).lean().exec();
    return Boolean(deleted);
  }

  /**
   * Count documents matching filter
   */
  async count(filter = {}) {
    return await this.model.countDocuments(filter).exec();
  }
}
