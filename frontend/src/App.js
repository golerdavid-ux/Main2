import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Form state
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerAddress: '',
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    taxRate: '',
    notes: '',
  });

  const [items, setItems] = useState([
    { productId: '', name: '', description: '', quantity: 1, rate: 0 }
  ]);

  // Load products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products`);
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      showMessage('Failed to load products', 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    // If product is selected, auto-fill rate and name
    if (field === 'productId' && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].name = product.name;
        newItems[index].description = product.description;
        newItems[index].rate = product.rate;
      }
    }

    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { productId: '', name: '', description: '', quantity: 1, rate: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateTotal = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const tax = formData.taxRate ? (subtotal * parseFloat(formData.taxRate) / 100) : 0;
    return { subtotal, tax, total: subtotal + tax };
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.customerName || !formData.customerEmail) {
      showMessage('Please fill in customer name and email', 'error');
      return;
    }

    if (items.some(item => !item.name || item.quantity <= 0 || item.rate <= 0)) {
      showMessage('Please ensure all items have valid details', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/invoice/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          items: items.map(({ productId, ...item }) => item),
          taxRate: formData.taxRate ? parseFloat(formData.taxRate) : 0,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showMessage(`Invoice #${data.invoiceNumber} sent successfully to ${formData.customerEmail}!`, 'success');
        // Reset form
        setFormData({
          customerName: '',
          customerEmail: '',
          customerAddress: '',
          invoiceNumber: '',
          date: new Date().toISOString().split('T')[0],
          dueDate: '',
          taxRate: '',
          notes: '',
        });
        setItems([{ productId: '', name: '', description: '', quantity: 1, rate: 0 }]);
      } else {
        showMessage(data.error || 'Failed to generate invoice', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showMessage('Failed to connect to server', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/invoice/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          items: items.map(({ productId, ...item }) => item),
          taxRate: formData.taxRate ? parseFloat(formData.taxRate) : 0,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'invoice-preview.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showMessage('Preview downloaded successfully', 'success');
      } else {
        showMessage('Failed to generate preview', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showMessage('Failed to generate preview', 'error');
    }
  };

  const { subtotal, tax, total } = calculateTotal();

  return (
    <div className="App">
      <div className="container">
        <h1>Invoice Generator</h1>
        <p className="subtitle">Generate and email professional invoices</p>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Customer Information */}
          <div className="section">
            <h2>Customer Information</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Customer Name *</label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Customer Email *</label>
                <input
                  type="email"
                  name="customerEmail"
                  value={formData.customerEmail}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Customer Address</label>
              <textarea
                name="customerAddress"
                value={formData.customerAddress}
                onChange={handleInputChange}
                rows="2"
              />
            </div>
          </div>

          {/* Invoice Details */}
          <div className="section">
            <h2>Invoice Details</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Invoice Number</label>
                <input
                  type="text"
                  name="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={handleInputChange}
                  placeholder="Auto-generated if empty"
                />
              </div>
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="section">
            <h2>Items / Services</h2>
            {items.map((item, index) => (
              <div key={index} className="item-row">
                <div className="form-row">
                  <div className="form-group flex-2">
                    <label>Product / Service</label>
                    <select
                      value={item.productId}
                      onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                    >
                      <option value="">Custom / Select Product</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} - ${product.rate}/{product.unit}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 1)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Rate ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Amount</label>
                    <input
                      type="text"
                      value={`$${(item.quantity * item.rate).toFixed(2)}`}
                      readOnly
                      className="readonly"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group flex-2">
                    <label>Item Name</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                      placeholder="Item name"
                    />
                  </div>
                  <div className="form-group flex-2">
                    <label>Description</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="Item description (optional)"
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => removeItem(index)}
                      title="Remove item"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" onClick={addItem} className="btn-add">
              + Add Item
            </button>
          </div>

          {/* Summary */}
          <div className="section">
            <div className="summary">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <div className="form-group inline">
                  <label>Tax Rate (%):</label>
                  <input
                    type="number"
                    name="taxRate"
                    value={formData.taxRate}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="0"
                    className="small"
                  />
                </div>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="summary-row total">
                <strong>Total:</strong>
                <strong>${total.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="section">
            <div className="form-group">
              <label>Notes / Payment Terms</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
                placeholder="Thank you for your business..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="actions">
            <button
              type="button"
              onClick={handlePreview}
              className="btn-secondary"
              disabled={loading}
            >
              Preview PDF
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Generate & Email Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
