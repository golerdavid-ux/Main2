const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate an invoice PDF
 * @param {Object} invoiceData - Invoice details
 * @param {string} outputPath - Path to save the PDF
 * @returns {Promise<string>} - Path to the generated PDF
 */
function generateInvoicePDF(invoiceData, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(outputPath);

      doc.pipe(stream);

      // Header
      doc.fontSize(20)
         .text(invoiceData.businessName || 'Your Business', 50, 50);

      doc.fontSize(10)
         .text(invoiceData.businessAddress || '', 50, 80)
         .text(invoiceData.businessPhone || '', 50, 95)
         .text(invoiceData.businessEmail || '', 50, 110);

      // Invoice title
      doc.fontSize(24)
         .text('INVOICE', 400, 50);

      // Invoice details
      doc.fontSize(10)
         .text(`Invoice #: ${invoiceData.invoiceNumber}`, 400, 80)
         .text(`Date: ${invoiceData.date}`, 400, 95);

      if (invoiceData.dueDate) {
        doc.text(`Due Date: ${invoiceData.dueDate}`, 400, 110);
      }

      // Customer information
      doc.fontSize(12)
         .text('Bill To:', 50, 160);

      doc.fontSize(10)
         .text(invoiceData.customerName || '', 50, 180)
         .text(invoiceData.customerEmail || '', 50, 195)
         .text(invoiceData.customerAddress || '', 50, 210);

      // Line separator
      doc.moveTo(50, 250)
         .lineTo(550, 250)
         .stroke();

      // Table header
      const tableTop = 270;
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('Item', 50, tableTop)
         .text('Quantity', 300, tableTop)
         .text('Rate', 380, tableTop)
         .text('Amount', 480, tableTop);

      doc.moveTo(50, tableTop + 15)
         .lineTo(550, tableTop + 15)
         .stroke();

      // Table rows
      doc.font('Helvetica');
      let yPosition = tableTop + 25;
      let subtotal = 0;

      invoiceData.items.forEach((item) => {
        const amount = item.quantity * item.rate;
        subtotal += amount;

        doc.text(item.name, 50, yPosition)
           .text(item.quantity.toString(), 300, yPosition)
           .text(`$${item.rate.toFixed(2)}`, 380, yPosition)
           .text(`$${amount.toFixed(2)}`, 480, yPosition);

        if (item.description) {
          yPosition += 15;
          doc.fontSize(8)
             .fillColor('#666')
             .text(item.description, 50, yPosition, { width: 240 })
             .fillColor('#000')
             .fontSize(10);
        }

        yPosition += 25;
      });

      // Totals
      yPosition += 20;
      doc.moveTo(50, yPosition)
         .lineTo(550, yPosition)
         .stroke();

      yPosition += 15;
      doc.text('Subtotal:', 380, yPosition)
         .text(`$${subtotal.toFixed(2)}`, 480, yPosition);

      const tax = invoiceData.taxRate ? (subtotal * invoiceData.taxRate / 100) : 0;
      if (tax > 0) {
        yPosition += 20;
        doc.text(`Tax (${invoiceData.taxRate}%):`, 380, yPosition)
           .text(`$${tax.toFixed(2)}`, 480, yPosition);
      }

      yPosition += 20;
      doc.font('Helvetica-Bold')
         .fontSize(12)
         .text('Total:', 380, yPosition)
         .text(`$${(subtotal + tax).toFixed(2)}`, 480, yPosition);

      // Footer notes
      if (invoiceData.notes) {
        yPosition += 50;
        doc.font('Helvetica')
           .fontSize(10)
           .text('Notes:', 50, yPosition)
           .fontSize(9)
           .text(invoiceData.notes, 50, yPosition + 15, { width: 500 });
      }

      // Payment info
      yPosition += 80;
      doc.fontSize(8)
         .fillColor('#666')
         .text('Thank you for your business!', 50, yPosition, { align: 'center', width: 500 });

      doc.end();

      stream.on('finish', () => {
        resolve(outputPath);
      });

      stream.on('error', (err) => {
        reject(err);
      });

    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generateInvoicePDF };
