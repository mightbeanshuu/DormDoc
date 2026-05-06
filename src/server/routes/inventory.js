const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const { authenticateToken } = require('../middleware/auth');
const InventoryItem = require('../models/InventoryItem');

const router = express.Router();

// Configure multer for CSV uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/csv');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      return cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Apply authentication to all routes
router.use(authenticateToken);

// @route   GET /api/admin/inventory
// @desc    Get all inventory items
// @access  Private (Admin only)
router.get('/admin/inventory', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const inventoryItems = await InventoryItem.find().sort({ name: 1 });
    res.json(inventoryItems);
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ message: 'Server error fetching inventory' });
  }
});

// @route   POST /api/admin/inventory
// @desc    Add new inventory item
// @access  Private (Admin only)
router.post('/admin/inventory', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const {
      name,
      category,
      description,
      currentStock,
      minimumStock,
      maximumStock,
      unitPrice,
      supplier,
      expiryDate,
      batchNumber
    } = req.body;

    if (!name || !category || !currentStock || !minimumStock || !maximumStock) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const inventoryItem = new InventoryItem({
      name,
      category,
      description,
      currentStock: parseInt(currentStock),
      minimumStock: parseInt(minimumStock),
      maximumStock: parseInt(maximumStock),
      unitPrice: parseFloat(unitPrice) || 0,
      supplier,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      batchNumber,
      addedBy: req.user.id
    });

    await inventoryItem.save();
    res.json(inventoryItem);
  } catch (error) {
    console.error('Add inventory item error:', error);
    res.status(500).json({ message: 'Server error adding inventory item' });
  }
});

// @route   PUT /api/admin/inventory/:id
// @desc    Update inventory item
// @access  Private (Admin only)
router.put('/admin/inventory/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const {
      name,
      category,
      description,
      currentStock,
      minimumStock,
      maximumStock,
      unitPrice,
      supplier,
      expiryDate,
      batchNumber
    } = req.body;

    const inventoryItem = await InventoryItem.findById(req.params.id);
    if (!inventoryItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    inventoryItem.name = name || inventoryItem.name;
    inventoryItem.category = category || inventoryItem.category;
    inventoryItem.description = description || inventoryItem.description;
    inventoryItem.currentStock = parseInt(currentStock) || inventoryItem.currentStock;
    inventoryItem.minimumStock = parseInt(minimumStock) || inventoryItem.minimumStock;
    inventoryItem.maximumStock = parseInt(maximumStock) || inventoryItem.maximumStock;
    inventoryItem.unitPrice = parseFloat(unitPrice) || inventoryItem.unitPrice;
    inventoryItem.supplier = supplier || inventoryItem.supplier;
    inventoryItem.expiryDate = expiryDate ? new Date(expiryDate) : inventoryItem.expiryDate;
    inventoryItem.batchNumber = batchNumber || inventoryItem.batchNumber;
    inventoryItem.updatedBy = req.user.id;
    inventoryItem.updatedAt = new Date();

    await inventoryItem.save();
    res.json(inventoryItem);
  } catch (error) {
    console.error('Update inventory item error:', error);
    res.status(500).json({ message: 'Server error updating inventory item' });
  }
});

// @route   DELETE /api/admin/inventory/:id
// @desc    Delete inventory item
// @access  Private (Admin only)
router.delete('/admin/inventory/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const inventoryItem = await InventoryItem.findById(req.params.id);
    if (!inventoryItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    await InventoryItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('Delete inventory item error:', error);
    res.status(500).json({ message: 'Server error deleting inventory item' });
  }
});

// @route   POST /api/admin/inventory/upload-csv
// @desc    Upload CSV file for bulk inventory update
// @access  Private (Admin only)
router.post('/admin/inventory/upload-csv', upload.single('csvFile'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No CSV file uploaded' });
    }

    const results = [];
    const errors = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', async () => {
        try {
          for (const row of results) {
            try {
              const inventoryItem = new InventoryItem({
                name: row.name,
                category: row.category || 'medication',
                description: row.description || '',
                currentStock: parseInt(row.currentStock) || 0,
                minimumStock: parseInt(row.minimumStock) || 0,
                maximumStock: parseInt(row.maximumStock) || 0,
                unitPrice: parseFloat(row.unitPrice) || 0,
                supplier: row.supplier || '',
                expiryDate: row.expiryDate ? new Date(row.expiryDate) : null,
                batchNumber: row.batchNumber || '',
                addedBy: req.user.id
              });

              await inventoryItem.save();
            } catch (itemError) {
              errors.push({
                row: row,
                error: itemError.message
              });
            }
          }

          // Clean up uploaded file
          fs.unlinkSync(req.file.path);

          res.json({
            message: 'CSV file processed successfully',
            totalRows: results.length,
            successCount: results.length - errors.length,
            errorCount: errors.length,
            errors: errors
          });
        } catch (error) {
          console.error('CSV processing error:', error);
          res.status(500).json({ message: 'Error processing CSV file' });
        }
      });
  } catch (error) {
    console.error('CSV upload error:', error);
    res.status(500).json({ message: 'Server error uploading CSV file' });
  }
});

// @route   GET /api/admin/inventory/export-csv
// @desc    Export inventory to CSV
// @access  Private (Admin only)
router.get('/admin/inventory/export-csv', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const inventoryItems = await InventoryItem.find().sort({ name: 1 });

    // Create CSV content
    const csvHeader = 'Name,Category,Description,Current Stock,Minimum Stock,Maximum Stock,Unit Price,Supplier,Expiry Date,Batch Number,Status\n';
    const csvRows = inventoryItems.map(item => {
      const status = item.currentStock === 0 ? 'Out of Stock' :
                   item.currentStock <= item.minimumStock ? 'Low Stock' :
                   new Date(item.expiryDate) < new Date() ? 'Expired' : 'In Stock';
      
      return `"${item.name}","${item.category}","${item.description}","${item.currentStock}","${item.minimumStock}","${item.maximumStock}","${item.unitPrice}","${item.supplier}","${item.expiryDate ? item.expiryDate.toISOString().split('T')[0] : ''}","${item.batchNumber}","${status}"`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ message: 'Server error exporting CSV' });
  }
});

// @route   GET /api/admin/inventory/low-stock
// @desc    Get low stock items
// @access  Private (Admin only)
router.get('/admin/inventory/low-stock', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const lowStockItems = await InventoryItem.find({
      $expr: { $lte: ['$currentStock', '$minimumStock'] }
    }).sort({ currentStock: 1 });

    res.json(lowStockItems);
  } catch (error) {
    console.error('Get low stock items error:', error);
    res.status(500).json({ message: 'Server error fetching low stock items' });
  }
});

// @route   GET /api/admin/inventory/expired
// @desc    Get expired items
// @access  Private (Admin only)
router.get('/admin/inventory/expired', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const expiredItems = await InventoryItem.find({
      expiryDate: { $lt: new Date() }
    }).sort({ expiryDate: 1 });

    res.json(expiredItems);
  } catch (error) {
    console.error('Get expired items error:', error);
    res.status(500).json({ message: 'Server error fetching expired items' });
  }
});

// @route   PUT /api/admin/inventory/:id/stock
// @desc    Update stock level
// @access  Private (Admin only)
router.put('/admin/inventory/:id/stock', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { currentStock, operation, quantity } = req.body;

    const inventoryItem = await InventoryItem.findById(req.params.id);
    if (!inventoryItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    if (currentStock !== undefined) {
      inventoryItem.currentStock = parseInt(currentStock);
    } else if (operation && quantity) {
      const qty = parseInt(quantity);
      if (operation === 'add') {
        inventoryItem.currentStock += qty;
      } else if (operation === 'subtract') {
        inventoryItem.currentStock = Math.max(0, inventoryItem.currentStock - qty);
      }
    }

    inventoryItem.updatedBy = req.user.id;
    inventoryItem.updatedAt = new Date();

    await inventoryItem.save();
    res.json(inventoryItem);
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ message: 'Server error updating stock' });
  }
});

module.exports = router;
