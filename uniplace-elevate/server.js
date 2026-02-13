import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import nodemailer from 'nodemailer';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

app.post('/send-email', async (req, res) => {
  const { to, subject, body } = req.body;

  // --- 1. CONFIGURATION (Images must be PUBLIC links) ---

  const BANNER_IMAGE = "https://assets.visme.co/templates/banners/thumbnails/i_Congratulations-Email-Header_full.jpg"; // Example 

  // --- 2. HTML TEMPLATE ---
  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      
      <div style="background-color: #0F172A; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">UniPlace</h1>
        <p style="color: #94A3B8; margin: 5px 0 0;">Placement & Recruitment Drive</p>
      </div>

      <div style="padding: 30px; background-color: #ffffff;">
        <h2 style="color: #334155; margin-top: 0;">Update from Admin</h2>
        
        <p style="font-size: 16px; line-height: 1.6; color: #475569;">
          ${body.replace(/\n/g, "<br>")}
        </p>

        <div style="margin-top: 25px; border-radius: 8px; overflow: hidden;">
          <img src="${BANNER_IMAGE}" alt="Update Details" style="width: 100%; height: auto; display: block;">
        </div>
        
        <p style="font-size: 14px; color: #64748B; margin-top: 20px; font-style: italic;">
          Please log in to the student portal to view full details and take necessary action.
        </p>

        <div style="text-align: center; margin-top: 30px;">
          <a href="http://localhost:8080" style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Open Student Portal</a>
        </div>
      </div>

      <div style="background-color: #F8FAFC; padding: 15px; text-align: center; font-size: 12px; color: #94A3B8; border-top: 1px solid #e0e0e0;">
        <p>&copy; 2026 UniPlace. All rights reserved.</p>
        <p>University Placement Cell | Admin Block</p>
      </div>
    </div>
  `;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: "rizzary9@gmail.com",
      pass: "zhld dtml wenp iuoe" // Your 16-char password (ensure the last 'x' or missing letter is correct from previous step)
    }
  });

  try {
    await transporter.sendMail({
      from: '"UniPlace Admin" <rizzary9@gmail.com>',
      to: to,
      subject: subject,
      html: htmlTemplate,
    });

    console.log(`Email sent to ${to.length} recipients`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
