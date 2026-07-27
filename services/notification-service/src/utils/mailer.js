const nodemailer = require("nodemailer");

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    console.log(`[SMTP] Using configured SMTP server: ${host}:${port}`);
    const isGmail = host.toLowerCase().includes("gmail.com");
    transporter = nodemailer.createTransport(isGmail ? {
      service: "gmail",
      auth: { user, pass }
    } : {
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false
      }
    });
  } else {
    console.log("[SMTP] No SMTP credentials in environment. Creating temporary Ethereal test account...");
    try {
      const testAccount = await nodemailer.createTestAccount();
      console.log(`[SMTP] Created Ethereal account: ${testAccount.user}`);
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    } catch (err) {
      console.error("[SMTP] Failed to create Ethereal account, falling back to dummy console transport:", err.message);
      transporter = {
        sendMail: async (mailOptions) => {
          console.log("==========================================");
          console.log(`[CONSOLE EMAIL FALLBACK] To: ${mailOptions.to}`);
          console.log(`Subject: ${mailOptions.subject}`);
          console.log(`Message:\n${mailOptions.text}`);
          console.log("==========================================");
          return { messageId: "console-fallback-id" };
        }
      };
    }
  }
  return transporter;
}

exports.sendMail = async ({ to, subject, text }) => {
  try {
    const client = await getTransporter();
    const from = process.env.SMTP_USER || process.env.SMTP_FROM || `"Docketwise System" <no-reply@docketwise.local>`;
    
    // Extract 6-digit OTP code if present in the text body
    const otpMatch = text.match(/\b\d{6}\b/);
    const otpCode = otpMatch ? otpMatch[0] : null;

    let emailSubject = subject;
    if (otpCode) {
      emailSubject = `[Docketwise] Security Verification Code: ${otpCode}`;
    }

    const htmlBody = otpCode ? `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 40px auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px;">⚖️</span>
          <h2 style="color: #0f172a; margin: 12px 0 4px 0; font-size: 20px; font-weight: 700; tracking-tight: -0.02em;">Docketwise Security Ledger</h2>
          <p style="color: #64748b; margin: 0; font-size: 12px; font-family: monospace; text-transform: uppercase; letter-spacing: 0.05em;">Verification Alert</p>
        </div>
        <div style="height: 1px; bg-color: #cbd5e1; margin-bottom: 24px;"></div>
        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
          A password recovery request was initiated for your Docketwise workspace. Please use the following One-Time Password (OTP) code to verify your identity:
        </p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; text-align: center; margin-bottom: 24px; border-radius: 8px;">
          <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0f172a;">${otpCode}</span>
        </div>
        <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0 0 24px 0;">
          This code is valid for <strong>10 minutes</strong>. If you did not request a password reset, you can safely ignore this alert.
        </p>
        <div style="border-t: 1px solid #e2e8f0; padding-top: 16px; text-align: center;">
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">This is an automated security transmission. Do not reply directly to this address.</p>
        </div>
      </div>
    ` : `
      <div style="font-family: sans-serif; padding: 20px; color: #334155;">
        <p style="font-size: 14px; line-height: 1.5;">${text}</p>
      </div>
    `;

    const info = await client.sendMail({
      from,
      to,
      subject: emailSubject,
      text,
      html: htmlBody,
      replyTo: from,
      headers: {
        "X-Priority": "1",
        "X-MSMail-Priority": "High",
        "Importance": "high",
        "Auto-Submitted": "auto-generated",
        "X-Auto-Response-Loop": "auto-generated",
        "Precedence": "list"
      }
    });

    console.log(`[SMTP] Email sent to ${to}. MessageId: ${info.messageId}`);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[SMTP] Ethereal preview URL: ${previewUrl}`);
    }
    return info;
  } catch (err) {
    console.error(`[SMTP] Failed to send email to ${to}:`, err.message);
    throw err;
  }
};
