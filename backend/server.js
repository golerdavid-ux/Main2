const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { generateInvoicePDF } = require('./services/pdfGenerator');
const { sendInvoiceEmail } = require('./services/emailService');
const booksRouter = require('./routes/books');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Create temp directory for PDFs if it doesn't exist
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Load products
const productsPath = path.join(__dirname, 'products.json');
let productsData = { products: [] };

try {
  const data = fs.readFileSync(productsPath, 'utf8');
  productsData = JSON.parse(data);
} catch (error) {
  console.error('Error loading products:', error);
}

/**
 * GET /api/products
 * Get all available products with their rates
 */
app.get('/api/products', (req, res) => {
  res.json(productsData);
});

/**
 * POST /api/invoice/generate
 * Generate and email an invoice
 */
app.post('/api/invoice/generate', async (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      customerAddress,
      items,
      invoiceNumber,
      date,
      dueDate,
      taxRate,
      notes,
    } = req.body;

    // Validate required fields
    if (!customerName || !customerEmail || !items || items.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: customerName, customerEmail, and items are required',
      });
    }

    // Generate unique invoice number if not provided
    const finalInvoiceNumber = invoiceNumber || `INV-${Date.now()}`;
    const invoiceDate = date || new Date().toISOString().split('T')[0];

    // Calculate total
    let subtotal = 0;
    items.forEach(item => {
      subtotal += item.quantity * item.rate;
    });
    const tax = taxRate ? (subtotal * taxRate / 100) : 0;
    const total = subtotal + tax;

    // Prepare invoice data
    const invoiceData = {
      businessName: process.env.BUSINESS_NAME,
      businessAddress: process.env.BUSINESS_ADDRESS,
      businessPhone: process.env.BUSINESS_PHONE,
      businessEmail: process.env.BUSINESS_EMAIL,
      customerName,
      customerEmail,
      customerAddress,
      items,
      invoiceNumber: finalInvoiceNumber,
      date: invoiceDate,
      dueDate,
      taxRate,
      notes,
    };

    // Generate PDF
    const pdfFileName = `invoice-${finalInvoiceNumber}-${Date.now()}.pdf`;
    const pdfPath = path.join(tempDir, pdfFileName);

    await generateInvoicePDF(invoiceData, pdfPath);

    // Send email
    const emailData = {
      to: customerEmail,
      customerName,
      invoiceNumber: finalInvoiceNumber,
      date: invoiceDate,
      total,
      message: notes,
    };

    const emailResult = await sendInvoiceEmail(emailData, pdfPath);

    // Clean up PDF file after sending
    setTimeout(() => {
      try {
        if (fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath);
        }
      } catch (err) {
        console.error('Error deleting PDF:', err);
      }
    }, 5000);

    if (emailResult.success) {
      res.json({
        success: true,
        message: 'Invoice generated and sent successfully',
        invoiceNumber: finalInvoiceNumber,
        total: total.toFixed(2),
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Invoice generated but failed to send email: ' + emailResult.error,
      });
    }

  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({
      error: 'Failed to generate invoice: ' + error.message,
    });
  }
});

/**
 * POST /api/invoice/preview
 * Generate a preview PDF without sending email
 */
app.post('/api/invoice/preview', async (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      customerAddress,
      items,
      invoiceNumber,
      date,
      dueDate,
      taxRate,
      notes,
    } = req.body;

    const finalInvoiceNumber = invoiceNumber || `INV-PREVIEW-${Date.now()}`;
    const invoiceDate = date || new Date().toISOString().split('T')[0];

    const invoiceData = {
      businessName: process.env.BUSINESS_NAME,
      businessAddress: process.env.BUSINESS_ADDRESS,
      businessPhone: process.env.BUSINESS_PHONE,
      businessEmail: process.env.BUSINESS_EMAIL,
      customerName: customerName || 'Customer Name',
      customerEmail: customerEmail || 'customer@example.com',
      customerAddress,
      items: items || [],
      invoiceNumber: finalInvoiceNumber,
      date: invoiceDate,
      dueDate,
      taxRate,
      notes,
    };

    const pdfFileName = `preview-${Date.now()}.pdf`;
    const pdfPath = path.join(tempDir, pdfFileName);

    await generateInvoicePDF(invoiceData, pdfPath);

    // Send the PDF file
    res.download(pdfPath, `invoice-preview.pdf`, (err) => {
      if (err) {
        console.error('Error sending preview:', err);
      }
      // Clean up
      setTimeout(() => {
        try {
          if (fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
          }
        } catch (err) {
          console.error('Error deleting preview PDF:', err);
        }
      }, 1000);
    });

  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({
      error: 'Failed to generate preview: ' + error.message,
    });
  }
});

// Book Publishing Platform routes
app.use('/api/books', booksRouter);

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// Serve frontend in production
const frontendBuild = path.join(__dirname, '..', 'frontend', 'build');
if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Products loaded: ${productsData.products.length}`);
});
