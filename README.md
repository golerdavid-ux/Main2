# Invoice Generator

A full-stack invoice generator application that allows you to create professional invoices with PDF generation and email delivery.

## Features

- **Professional Invoice Form**: Easy-to-use interface with customer information, invoice details, and line items
- **Product/Service Management**: Pre-configured product rates stored in JSON
- **Automatic Calculations**: Real-time subtotal, tax, and total calculations
- **PDF Generation**: High-quality PDF invoices using PDFKit
- **Email Delivery**: Automatic email sending with invoice attached as PDF
- **Preview Functionality**: Download a preview PDF before sending
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Backend
- Node.js with Express
- PDFKit for PDF generation
- Nodemailer for email delivery
- CORS enabled for frontend communication

### Frontend
- React 18
- Modern CSS with responsive design
- Real-time form validation

## Project Structure

```
Main2/
├── backend/
│   ├── services/
│   │   ├── pdfGenerator.js    # PDF generation service
│   │   └── emailService.js    # Email sending service
│   ├── temp/                  # Temporary storage for PDFs (auto-created)
│   ├── server.js              # Express server and API endpoints
│   ├── products.json          # Product/service rates database
│   ├── package.json
│   └── .env.example           # Environment variables template
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js            # Main React component
│   │   ├── App.css           # Styling
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
└── README.md
```

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- An email account for SMTP (Gmail, Outlook, etc.)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. Configure your `.env` file with your settings:
```env
PORT=3001

# Email Configuration (Example for Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Business Information
BUSINESS_NAME=Your Business Name
BUSINESS_EMAIL=business@example.com
BUSINESS_ADDRESS=123 Business St, City, State 12345
BUSINESS_PHONE=+1 (555) 123-4567
```

**Note for Gmail users**: You need to use an App Password, not your regular Gmail password:
- Go to Google Account settings
- Security → 2-Step Verification → App passwords
- Generate a new app password for "Mail"
- Use this password in the `.env` file

5. Start the backend server:
```bash
npm start
```

The API will be running on `http://localhost:3001`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Create a `.env` file if your backend is on a different port:
```env
REACT_APP_API_URL=http://localhost:3001
```

4. Start the development server:
```bash
npm start
```

The app will open at `http://localhost:3000`

## Usage

### Using the Invoice Generator

1. **Customer Information**: Enter customer name, email, and optional address
2. **Invoice Details**: Set invoice number (auto-generated if empty), date, and due date
3. **Add Items**:
   - Select from pre-configured products/services, or
   - Enter custom items with name, description, quantity, and rate
   - Add multiple items using the "+ Add Item" button
4. **Tax**: Optionally add a tax rate percentage
5. **Notes**: Add payment terms or thank you notes
6. **Preview**: Click "Preview PDF" to download and review the invoice
7. **Send**: Click "Generate & Email Invoice" to create the PDF and send it via email

### Managing Products

Edit `backend/products.json` to add, remove, or modify your products and rates:

```json
{
  "products": [
    {
      "id": "prod_001",
      "name": "Web Design - Basic",
      "description": "Basic website design package",
      "rate": 500,
      "unit": "project"
    }
  ]
}
```

## API Endpoints

### GET `/api/products`
Get all available products with their rates.

**Response:**
```json
{
  "products": [...]
}
```

### POST `/api/invoice/generate`
Generate an invoice PDF and send it via email.

**Request Body:**
```json
{
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerAddress": "123 Main St",
  "items": [
    {
      "name": "Web Design",
      "description": "Homepage design",
      "quantity": 1,
      "rate": 500
    }
  ],
  "invoiceNumber": "INV-001",
  "date": "2025-01-01",
  "dueDate": "2025-01-15",
  "taxRate": 10,
  "notes": "Thank you for your business"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invoice generated and sent successfully",
  "invoiceNumber": "INV-001",
  "total": "550.00"
}
```

### POST `/api/invoice/preview`
Generate a preview PDF without sending an email.

**Request Body:** Same as `/api/invoice/generate`

**Response:** PDF file download

### GET `/api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Invoice Generator API is running"
}
```

## Troubleshooting

### Email not sending
- Verify your SMTP credentials in `.env`
- For Gmail, ensure you're using an App Password
- Check that 2-Step Verification is enabled for Gmail
- Try using port 465 with `EMAIL_SECURE=true` for SSL

### PDF generation errors
- Ensure the `backend/temp` directory exists (it's auto-created)
- Check file permissions on the temp directory

### CORS errors
- Verify the backend is running on port 3001
- Check that CORS is enabled in `server.js`

### Frontend can't connect to backend
- Ensure both servers are running
- Verify `REACT_APP_API_URL` in frontend `.env` matches your backend URL

## Development

### Backend Development
Use nodemon for auto-restart on file changes:
```bash
npm run dev
```

### Frontend Development
The React development server supports hot reloading by default:
```bash
npm start
```

## Production Deployment

### Backend
1. Set `NODE_ENV=production` in your environment
2. Use a process manager like PM2:
```bash
npm install -g pm2
pm2 start server.js --name invoice-api
```

### Frontend
1. Build the production bundle:
```bash
npm run build
```

2. Serve the `build` directory with a static server or deploy to a hosting platform

## License

ISC

## Support

For issues or questions, please open an issue on the repository.
