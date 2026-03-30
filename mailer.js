const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.hostinger.com',
  port:   parseInt(process.env.SMTP_PORT) || 465,
  secure: true, // SSL port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ── Email de boas-vindas com link de criar senha ──────────────────────────────
async function sendWelcomeEmail(email, name) {
  const resetUrl = `https://app.ytblock.space/reset-password`;
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      email,
    subject: '🎉 Seu acesso ao YTBlock está pronto!',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#000;font-family:'Poppins',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0e0e18;border:1px solid #1a1a2e;border-radius:16px;overflow:hidden;max-width:560px;width:100%">
        
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#001a0d 0%,#0e0e18 100%);padding:36px 40px;text-align:center;border-bottom:1px solid #1a1a2e">
            <div style="display:inline-flex;align-items:center;gap:10px">
              <div style="width:42px;height:42px;border-radius:10px;background:rgba(0,255,136,.12);border:1px solid rgba(0,255,136,.3);display:inline-flex;align-items:center;justify-content:center">
                <span style="font-size:20px">🚫</span>
              </div>
              <span style="font-size:20px;font-weight:700;color:#00ff88;letter-spacing:.06em">YTBlock<span style="color:#8888a8;font-weight:400">.space</span></span>
            </div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px">
            <h1 style="font-size:24px;font-weight:700;color:#f0f0f8;margin:0 0 12px;line-height:1.2">
              Olá, ${name || 'bem-vindo'}! 👋
            </h1>
            <p style="font-size:15px;color:#8888a8;line-height:1.7;margin:0 0 28px">
              Seu acesso ao <strong style="color:#f0f0f8">YTBlock</strong> está ativo.<br>
              Agora você pode assistir YouTube <strong style="color:#00ff88">100% sem anúncios</strong>, de qualquer dispositivo.
            </p>

            <!-- Steps -->
            <div style="background:#161622;border:1px solid #1a1a2e;border-radius:12px;padding:24px;margin-bottom:28px">
              <p style="font-size:12px;font-weight:600;color:#44445a;letter-spacing:.1em;text-transform:uppercase;margin:0 0 16px">3 passos para começar</p>
              <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px">
                <span style="width:26px;height:26px;background:rgba(0,255,136,.1);border:1px solid rgba(0,255,136,.3);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#00ff88;flex-shrink:0">1</span>
                <p style="font-size:14px;color:#8888a8;margin:3px 0 0;line-height:1.5">Clique no botão abaixo para <strong style="color:#f0f0f8">criar sua senha</strong></p>
              </div>
              <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px">
                <span style="width:26px;height:26px;background:rgba(0,255,136,.1);border:1px solid rgba(0,255,136,.3);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#00ff88;flex-shrink:0">2</span>
                <p style="font-size:14px;color:#8888a8;margin:3px 0 0;line-height:1.5">Acesse <strong style="color:#f0f0f8">app.ytblock.space</strong> e faça login</p>
              </div>
              <div style="display:flex;align-items:flex-start;gap:12px">
                <span style="width:26px;height:26px;background:rgba(0,255,136,.1);border:1px solid rgba(0,255,136,.3);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#00ff88;flex-shrink:0">3</span>
                <p style="font-size:14px;color:#8888a8;margin:3px 0 0;line-height:1.5">Assista YouTube <strong style="color:#00ff88">sem nenhum anúncio</strong> ✅</p>
              </div>
            </div>

            <!-- CTA Button -->
            <div style="text-align:center;margin-bottom:28px">
              <a href="${resetUrl}" style="display:inline-block;background:#00ff88;color:#000;font-family:'Poppins',Arial,sans-serif;font-size:15px;font-weight:700;padding:15px 36px;border-radius:10px;text-decoration:none;letter-spacing:.04em">
                Criar minha senha →
              </a>
            </div>

            <p style="font-size:13px;color:#44445a;line-height:1.6;margin:0">
              Se o botão não funcionar, copie e cole este link no navegador:<br>
              <a href="${resetUrl}" style="color:#00cfff;font-size:12px">${resetUrl}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#07070c;padding:20px 40px;border-top:1px solid #1a1a2e;text-align:center">
            <p style="font-size:12px;color:#44445a;margin:0;line-height:1.6">
              Você recebeu este email pois adquiriu o YTBlock.<br>
              Dúvidas? Responda este email ou acesse <a href="https://app.ytblock.space" style="color:#00cfff">app.ytblock.space</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  });
}

// ── Email de senha resetada pelo admin ───────────────────────────────────────
async function sendPasswordResetEmail(email, name) {
  const resetUrl = `https://app.ytblock.space/reset-password`;
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      email,
    subject: '🔑 Redefinição de senha — YTBlock',
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#000;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 20px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#0e0e18;border:1px solid #1a1a2e;border-radius:16px;overflow:hidden;max-width:520px;width:100%">
        <tr><td style="padding:36px 40px;text-align:center;border-bottom:1px solid #1a1a2e">
          <span style="font-size:20px;font-weight:700;color:#00ff88;letter-spacing:.06em">YTBlock.space</span>
        </td></tr>
        <tr><td style="padding:36px 40px">
          <h2 style="color:#f0f0f8;font-size:20px;margin:0 0 12px">Olá, ${name}!</h2>
          <p style="color:#8888a8;font-size:14px;line-height:1.7;margin:0 0 24px">
            Uma nova senha foi solicitada para sua conta. Clique abaixo para criar sua nova senha.
          </p>
          <div style="text-align:center;margin-bottom:24px">
            <a href="${resetUrl}" style="display:inline-block;background:#00ff88;color:#000;font-size:14px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none">
              Criar nova senha →
            </a>
          </div>
          <p style="color:#44445a;font-size:12px">Se não foi você, ignore este email.</p>
        </td></tr>
        <tr><td style="background:#07070c;padding:18px 40px;border-top:1px solid #1a1a2e;text-align:center">
          <p style="font-size:11px;color:#44445a;margin:0">© 2025 YTBlock.space</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  });
}

module.exports = { sendWelcomeEmail, sendPasswordResetEmail };
