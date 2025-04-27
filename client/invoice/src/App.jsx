import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Form, Button, Table, Alert, Modal } from 'react-bootstrap';
import * as XLSX from 'xlsx';

function App() {
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState([{ name: '', price: 0, quantity: 1 }]);
  const [totalAmount, setTotalAmount] = useState('');
  const [gst, setGst] = useState(18);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [exportAll, setExportAll] = useState(false);

  const generateRandomInvoiceNumber = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomString = '';
    for (let i = 0; i < 10; i++) {
      randomString += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    setInvoiceNumber(randomString);
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = () => {
    axios.get('http://localhost:5000/invoices')
      .then(response => setInvoices(response.data))
      .catch(err => console.error('Error fetching invoices:', err));
  };

  const handleCreateInvoice = () => {
    if (!customerName || !invoiceNumber || !dueDate || items.some(item => !item.name || !item.price || !item.quantity)) {
      setError('Please fill all required fields!');
      return;
    }

    const totalBeforeGST = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const gstAmount = (totalBeforeGST * gst) / 100;
    const totalWithGST = totalBeforeGST + gstAmount;

    const invoiceData = {
      customer_name: customerName,
      items,
      total_amount: totalWithGST,
      gst,
      invoice_number: invoiceNumber,
      due_date: dueDate,
    };

    axios.post('http://localhost:5000/create-invoice', invoiceData)
      .then(() => {
        setSuccess('Invoice created successfully!');
        setError('');
        resetForm();
        fetchInvoices();
      })
      .catch(() => {
        setError('Error creating invoice');
        setSuccess('');
      });
  };

  const resetForm = () => {
    setCustomerName('');
    setItems([{ name: '', price: 0, quantity: 1 }]);
    setTotalAmount('');
    setGst(18);
    setInvoiceNumber('');
    setDueDate('');
  };

  const handleAddItem = () => {
    setItems([...items, { name: '', price: 0, quantity: 1 }]);
  };

  const handleRemoveItem = (index) => {
    const newItems = items.filter((_, idx) => idx !== index);
    setItems(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);

    const totalBeforeGST = newItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const gstAmount = (totalBeforeGST * gst) / 100;
    const totalWithGST = totalBeforeGST + gstAmount;
    setTotalAmount(totalWithGST.toFixed(2));
  };

  const exportInvoiceToExcel = (invoiceData) => {
    const ws = XLSX.utils.json_to_sheet([invoiceData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoice");
    XLSX.writeFile(wb, `Invoice_${invoiceData.invoice_number}.xlsx`);
  };

  const exportAllInvoicesToExcel = async () => {
    try {
      const response = await axios.get('http://localhost:5000/export-invoices', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Invoices.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();

      setSuccess('All invoices exported successfully!');
      setError('');
    } catch (error) {
      console.error('Error exporting all invoices:', error);
      setError('Failed to export all invoices.');
      setSuccess('');
    }
  };

  const exportInvoiceToTxt = (invoiceData) => {
    let content = `Invoice Number: ${invoiceData.invoice_number}\n`;
    content += `Customer Name: ${invoiceData.customer_name}\n`;
    content += `Total Amount: ₹${parseFloat(invoiceData.total_amount).toFixed(2)}\n`;
    content += `Due Date: ${invoiceData.due_date}\n`;
    content += `Date Created: ${invoiceData.date_created}\n`;
    content += `Items:\n`;

    const items = JSON.parse(invoiceData.items);
    items.forEach((item, index) => {
      content += `  ${index + 1}. ${item.name} - ₹${item.price} x ${item.quantity}\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Invoice_${invoiceData.invoice_number}.txt`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const exportAllInvoicesToTxt = async () => {
    try {
      const response = await axios.get('http://localhost:5000/invoices');
      const allInvoices = response.data;
      let content = '';

      allInvoices.forEach((invoice, idx) => {
        content += `Invoice ${idx + 1}\n`;
        content += `Invoice Number: ${invoice.invoice_number}\n`;
        content += `Customer Name: ${invoice.customer_name}\n`;
        content += `Total Amount: ₹${parseFloat(invoice.total_amount).toFixed(2)}\n`;
        content += `Due Date: ${invoice.due_date}\n`;
        content += `Date Created: ${invoice.date_created}\n`;
        content += `Items:\n`;
        const items = JSON.parse(invoice.items);
        items.forEach((item, index) => {
          content += `  ${index + 1}. ${item.name} - ₹${item.price} x ${item.quantity}\n`;
        });
        content += '\n-----------------------------\n\n';
      });

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'All_Invoices.txt');
      document.body.appendChild(link);
      link.click();
      link.remove();

      setSuccess('All invoices exported successfully as TXT!');
      setError('');
    } catch (error) {
      console.error('Error exporting all invoices to txt:', error);
      setError('Failed to export all invoices.');
      setSuccess('');
    }
  };

  const handleExportInvoice = (invoiceData) => {
    setSelectedInvoice(invoiceData);
    setExportAll(false);
    setShowExportModal(true);
  };

  const handleExportAll = () => {
    setSelectedInvoice(null);
    setExportAll(true);
    setShowExportModal(true);
  };

  const handleDownloadChoice = (format) => {
    if (exportAll) {
      format === 'txt' ? exportAllInvoicesToTxt() : exportAllInvoicesToExcel();
    } else {
      format === 'txt' ? exportInvoiceToTxt(selectedInvoice) : exportInvoiceToExcel(selectedInvoice);
    }
    setShowExportModal(false);
  };

  return (
    <Container className="my-5">
      <h1 className="text-center mb-4 text-primary">Invoice Generator</h1>

      {error && <Alert variant="danger" dismissible>{error}</Alert>}
      {success && <Alert variant="success" dismissible>{success}</Alert>}

      <Form>
  <Row className="mb-3">
    <Col>
      <Form.Group controlId="customerName">
        <Form.Label>Customer Name</Form.Label>
        <Form.Control
          type="text"
          placeholder="Enter customer name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
      </Form.Group>
    </Col>
    <Col>
      <Form.Group controlId="invoiceNumber">
        <Form.Label>Invoice Number</Form.Label>
        <Row className="align-items-center">
          <Col>
            <Form.Control
              type="text"
              placeholder="Invoice number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </Col>
          <Col xs="auto">
            <Button variant="info" onClick={generateRandomInvoiceNumber}>Generate</Button>
          </Col>
        </Row>
      </Form.Group>
    </Col>
    <Col xs={3}>
      {/* This is removed, since the button is now inside the form group row */}
    </Col>
  </Row>


        <Row className="mb-3">
          <Col>
            <Form.Group controlId="dueDate">
              <Form.Label>Due Date</Form.Label>
              <Form.Control
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Form.Group>
          </Col>
        </Row>

        <h4 className="mt-4">Items</h4>
        {items.map((item, index) => (
  <Row key={index} className="mb-3">
    <Col>
      <Form.Control
        type="text"
        placeholder="Item Name"
        value={item.name}
        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
      />
    </Col>
    <Col>
      <Form.Control
        type="text"
        placeholder="Unit Price"
        value={item.price || ''}
        onChange={(e) => handleItemChange(index, 'price', Number(e.target.value))}
      />
    </Col>
    <Col>
      <Form.Control
        type="text"
        placeholder="Quantity"
        value={item.quantity || ''}
        onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
      />
    </Col>
    <Col xs="auto">
      <Button variant="danger" onClick={() => handleRemoveItem(index)}>Remove</Button>
    </Col>
  </Row>
))}


        <Button variant="primary" onClick={handleAddItem}>Add Item</Button>

        <Row className="mt-4">
          <Col>
            <Form.Group controlId="totalAmount">
              <Form.Label>Total Amount (Including GST)</Form.Label>
              <Form.Control
                type="text"
                placeholder="Total Amount"
                value={totalAmount}
                readOnly
              />
            </Form.Group>
          </Col>
          <Col>
            <Form.Group controlId="gst">
              <Form.Label>GST (%)</Form.Label>
              <Form.Control
                type="number"
                value={gst}
                onChange={(e) => setGst(Number(e.target.value))}
              />
            </Form.Group>
          </Col>
        </Row>

        <Button variant="success" onClick={handleCreateInvoice} className="mt-3 w-100">Create Invoice</Button>
      </Form>

      <h3 className="mt-5">Invoices List</h3>
      <Button variant="info" className="mb-3" onClick={handleExportAll}>Export All Invoices</Button>

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Invoice Number</th>
            <th>Customer Name</th>
            <th>Total Amount</th>
            <th>Date Created</th>
            <th>Due Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td>{invoice.invoice_number}</td>
              <td>{invoice.customer_name}</td>
              <td>₹{parseFloat(invoice.total_amount).toFixed(2)}</td>
              <td>{invoice.date_created}</td>
              <td>{invoice.due_date}</td>
              <td>
                <Button variant="primary" onClick={() => handleExportInvoice(invoice)}>Export</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Export Modal */}
      <Modal show={showExportModal} onHide={() => setShowExportModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Choose Export Format</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>How would you like to export?</p>

          <Button variant="success" className="me-2" onClick={() => handleDownloadChoice('excel')}>Download as Excel</Button>
          <Button variant="secondary" onClick={() => handleDownloadChoice('txt')}>Download as Text</Button>
        </Modal.Body>
      </Modal>
    </Container>
  );
}

export default App;
