const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const xlsx = require('xlsx');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json());

// Set up MySQL database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',  // Add your MySQL password here
  database: 'invoice_db',
});

db.connect((err) => {
  if (err) throw err;
  console.log('MySQL Connected...');
});

// Create the invoices table if it doesn't exist
app.get('/create-table', (req, res) => {
  const query = `
    CREATE TABLE IF NOT EXISTS invoices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_name VARCHAR(255) NOT NULL,
      items JSON NOT NULL,
      total_amount DECIMAL(10, 2) NOT NULL,
      gst DECIMAL(5, 2) NOT NULL,
      invoice_number VARCHAR(255) NOT NULL,
      due_date DATE NOT NULL,
      date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  db.query(query, (err, result) => {
    if (err) throw err;
    res.send('Table created or already exists');
  });
});

// Create a new invoice
app.post('/create-invoice', (req, res) => {
  const { customer_name, items, total_amount, gst, invoice_number, due_date } = req.body;
  const query = 'INSERT INTO invoices (customer_name, items, total_amount, gst, invoice_number, due_date) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(query, [customer_name, JSON.stringify(items), total_amount, gst, invoice_number, due_date], (err, result) => {
    if (err) throw err;
    res.send({ message: 'Invoice created successfully', id: result.insertId });
  });
});

// Get all invoices
app.get('/invoices', (req, res) => {
  const query = 'SELECT * FROM invoices';
  db.query(query, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

// Get a specific invoice by ID
app.get('/invoice/:id', (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM invoices WHERE id = ?';
  db.query(query, [id], (err, results) => {
    if (err) throw err;
    res.json(results[0]);
  });
});

// Send invoice via email
app.post('/send-invoice', (req, res) => {
  const { email, invoiceId } = req.body;

  const query = 'SELECT * FROM invoices WHERE id = ?';
  db.query(query, [invoiceId], (err, results) => {
    if (err) throw err;
    const invoiceData = results[0];

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'your-email@gmail.com',
        pass: 'your-email-password',
      },
    });

    const mailOptions = {
      from: 'your-email@gmail.com',
      to: email,
      subject: `Invoice ${invoiceData.invoice_number}`,
      text: `Here is your invoice: ${invoiceData.invoice_number}`,
      attachments: [
        {
          filename: 'invoice.xlsx',
          content: Buffer.from(xlsx.write(xlsx.utils.book_new(), { bookType: 'xlsx', type: 'buffer' })),
        },
      ],
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).send(error.toString());
      }
      res.status(200).send('Invoice sent');
    });
  });
});

// Export invoices to Excel
app.get('/export-invoices', (req, res) => {
  const query = 'SELECT * FROM invoices';
  db.query(query, (err, results) => {
    if (err) throw err;

    const ws = XLSX.utils.json_to_sheet(results);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");

    const fileBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    res.setHeader('Content-Disposition', 'attachment; filename=Invoices.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(fileBuffer);
  });
});

// ✅✅✅ Export invoices to PDF
app.get('/export-invoices-pdf', (req, res) => {
  const query = 'SELECT * FROM invoices';
  db.query(query, (err, results) => {
    if (err) throw err;

    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    res.setHeader('Content-Disposition', 'attachment; filename=Invoices.pdf');
    res.setHeader('Content-Type', 'application/pdf');

    doc.pipe(res);

    doc.fontSize(20).text('Invoices List', { align: 'center' });
    doc.moveDown();

    results.forEach((invoice, idx) => {
      doc
        .fontSize(12)
        .text(`Invoice Number: ${invoice.invoice_number}`)
        .text(`Customer Name: ${invoice.customer_name}`)
        .text(`Total Amount: ₹${invoice.total_amount}`)
        .text(`GST: ${invoice.gst}%`)
        .text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`)
        .moveDown();

      if (idx !== results.length - 1) {
        doc.moveTo(30, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();
      }
    });

    doc.end();
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
