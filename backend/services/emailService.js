const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * Create email transporter
 */
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

/**
 * Send invoice email with PDF attachment
 * @param {Object} emailData - Email details
 * @param {string} pdfPath - Path to the PDF file
 * @returns {Promise<Object>} - Email send result
 */
async function sendInvoiceEmail(emailData, pdfPath) {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `${process.env.BUSINESS_NAME} <${process.env.EMAIL_USER}>`,
      to: emailData.to,
      subject: emailData.subject || 'Invoice from ' + process.env.BUSINESS_NAME,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Invoice</h2>
          <p>Dear ${emailData.customerName || 'Valued Customer'},</p>
          <p>Please find attached your invoice <strong>#${emailData.invoiceNumber}</strong>.</p>

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Invoice Number:</strong> ${emailData.invoiceNumber}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${emailData.date}</p>
            <p style="margin: 5px 0;"><strong>Total Amount:</strong> $${emailData.total.toFixed(2)}</p>
          </div>

          ${emailData.message ? `<p>${emailData.message}</p>` : ''}

          <p>If you have any questions regarding this invoice, please don't hesitate to contact us.</p>

          <p style="margin-top: 30px;">
            Best regards,<br>
            <strong>${process.env.BUSINESS_NAME}</strong><br>
            ${process.env.BUSINESS_EMAIL}<br>
            ${process.env.BUSINESS_PHONE || ''}
          </p>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">
            This is an automated email. Please do not reply directly to this message.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `invoice-${emailData.invoiceNumber}.pdf`,
          path: pdfPath,
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
      message: 'Invoice email sent successfully',
    };

  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = { sendInvoiceEmail };
