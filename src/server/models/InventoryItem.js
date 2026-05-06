const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['medication', 'supplies', 'equipment', 'consumables'],
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  currentStock: {
    type: Number,
    required: true,
    min: 0
  },
  minimumStock: {
    type: Number,
    required: true,
    min: 0
  },
  maximumStock: {
    type: Number,
    required: true,
    min: 0
  },
  unitPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  supplier: {
    type: String,
    default: ''
  },
  expiryDate: {
    type: Date,
    default: null
  },
  batchNumber: {
    type: String,
    default: ''
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
inventoryItemSchema.index({ name: 1 });
inventoryItemSchema.index({ category: 1 });
inventoryItemSchema.index({ currentStock: 1 });
inventoryItemSchema.index({ expiryDate: 1 });

// Virtual for stock status
inventoryItemSchema.virtual('stockStatus').get(function() {
  if (this.currentStock === 0) return 'out-of-stock';
  if (this.currentStock <= this.minimumStock) return 'low-stock';
  if (this.expiryDate && this.expiryDate < new Date()) return 'expired';
  return 'in-stock';
});

// Virtual for stock percentage
inventoryItemSchema.virtual('stockPercentage').get(function() {
  return (this.currentStock / this.maximumStock) * 100;
});

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
