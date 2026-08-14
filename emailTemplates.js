// BKG Email Templates v3 - dark theme matching binkhalidgroup.com exactly
// Palette: bg #0a0a0f / card #16161f / accent #F59C69 / text #f0ece6
// All emails sent from info@binkhalidgroup.com

const BRAND = {
  name: "Bin Khalid Group",
  logo: "https://bkg-whatsapp-server.onrender.com/assets/bkg-logo.png",
  bg: "#0a0a0f",
  card: "#16161f",
  cardAlt: "#1c1c28",
  accent: "#F59C69",
  accentLight: "#f7b48a",
  accentDark: "#d07a45",
  textPrimary: "#f0ece6",
  textBody: "#c7c3bd",
  textMuted: "#9a9a9a",
  border: "#26262f",
  phone: "042-35133492",
  mobile: "0345-9436328",
  website: "https://binkhalidgroup.com",
  tcUrl: "https://www.binkhalidgroup.com/tc",
  vendorLinkNumber: "0340 8442904",
  vendorLinkWa: "https://wa.me/923408442904",
};

function layout(preheader, title, subtitle, bodyHtml) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<style>@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap');</style>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:'Montserrat',Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:${BRAND.card};border:1px solid ${BRAND.border};border-bottom:none;border-radius:14px 14px 0 0;padding:30px 40px;" align="center">
            <img src="${BRAND.logo}" alt="${BRAND.name}" width="120" style="width:120px;max-width:120px;height:auto;display:block;border:0;outline:none;text-decoration:none;">
          </td>
        </tr>
        <tr><td style="height:3px;background:${BRAND.accent};font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Title block -->
        <tr>
          <td style="background:${BRAND.card};border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};padding:38px 44px 8px;">
            <h1 style="margin:0 0 8px;font-size:24px;line-height:1.3;color:${BRAND.textPrimary};">${title}</h1>
            <p style="margin:0;font-size:13px;letter-spacing:1px;color:${BRAND.accent};font-weight:bold;">${subtitle}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:${BRAND.card};border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};padding:22px 44px 34px;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- Signature -->
        <tr>
          <td style="background:${BRAND.card};border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};padding:0 44px 34px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid ${BRAND.border};">
              <tr><td style="padding-top:22px;">
                <p style="margin:0 0 2px;font-size:13px;color:${BRAND.textMuted};">Warm regards,</p>
                <p style="margin:0;font-size:15px;font-weight:bold;color:${BRAND.textPrimary};">Team ${BRAND.name}</p>
                <p style="margin:12px 0 0;font-size:12.5px;color:${BRAND.textMuted};line-height:1.8;">
                  Mobile / WhatsApp: ${BRAND.mobile}<br>
                  <a href="${BRAND.website}" style="color:${BRAND.accent};text-decoration:none;font-weight:bold;">binkhalidgroup.com</a>
                </p>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:${BRAND.bg};border:1px solid ${BRAND.border};border-top:1px solid ${BRAND.border};border-radius:0 0 14px 14px;padding:22px 44px;" align="center">
            <p style="margin:0 0 10px;font-size:11.5px;color:${BRAND.textMuted};line-height:1.7;">
              <strong style="color:${BRAND.textPrimary};">DHA</strong> 042-3513-3492 &nbsp;&bull;&nbsp; <strong style="color:${BRAND.textPrimary};">Gulberg</strong> 042-3513-3491 &nbsp;&bull;&nbsp; <strong style="color:${BRAND.textPrimary};">Bahria Town</strong> 042-3597-6161
            </p>
            <p style="margin:0 0 6px;font-size:11.5px;color:${BRAND.textMuted};line-height:1.7;">
              Architecture, construction, interiors and custom fabrication - all under one roof. Offices in Lahore and New York - serving clients across Pakistan and worldwide. 15+ years of experience.
            </p>
            <p style="margin:0;font-size:11px;color:#6d675f;">
              Terms and conditions apply. <a href="${BRAND.tcUrl}" style="color:${BRAND.accent};text-decoration:underline;">View terms &amp; conditions</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function detailCard(pairs) {
  const rows = pairs
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr>
          <td style="padding:9px 0 9px 18px;font-size:13px;color:${BRAND.textMuted};white-space:nowrap;vertical-align:top;width:150px;">${k}</td>
          <td style="padding:9px 18px 9px 12px;font-size:13.5px;color:${BRAND.textPrimary};font-weight:bold;line-height:1.5;">${v}</td>
        </tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.cardAlt};border-left:3px solid ${BRAND.accent};border-radius:0 10px 10px 0;margin:20px 0;">
    <tr><td style="height:8px;font-size:0;">&nbsp;</td></tr>
    ${rows}
    <tr><td style="height:8px;font-size:0;">&nbsp;</td></tr>
  </table>`;
}

function button(href, label, bgColor, textColor) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 10px;">
    <tr><td style="background:${bgColor};border-radius:100px;" align="center">
      <a href="${href}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:bold;color:${textColor};text-decoration:none;font-family:'Montserrat',Arial,Helvetica,sans-serif;">${label}</a>
    </td></tr>
  </table>`;
}

// 1. CLIENT CONFIRMATION - after form or chat submission
function clientConfirmation(lead) {
  const firstName = (lead.name || "").trim().split(" ")[0] || "there";
  const body = `
    <p style="font-size:14.5px;color:${BRAND.textBody};line-height:1.8;margin:0 0 6px;">
      Dear ${firstName},
    </p>
    <p style="font-size:14.5px;color:${BRAND.textBody};line-height:1.8;margin:0 0 6px;">
      Thank you for choosing ${BRAND.name}. We have received your project details, and the right specialist from our team will call you within <strong style="color:${BRAND.accent};">48 working hours</strong>.
    </p>
    ${detailCard([
      ["Services", lead.services],
      ["Project Type", lead.projectType],
      ["Location", lead.location],
      ["Plot / Size", lead.projectSize],
      ["Timeline", lead.timeline],
    ])}
    <p style="font-size:13px;color:${BRAND.textMuted};line-height:1.7;margin:0 0 16px;">
      Spot a mistake in these details? Just reply to this email and we'll correct it.
    </p>
    <p style="font-size:13.5px;color:${BRAND.textBody};line-height:1.8;margin:0 0 18px;">
      Meanwhile, explore our completed projects or reach us directly for anything urgent.
    </p>
    ${button(BRAND.website, "View Our Portfolio &rarr;", BRAND.accent, BRAND.bg)}`;
  return {
    subject: `We've received your project details - ${BRAND.name}`,
    html: layout(
      "Your project details are with our team - a specialist will call you within 48 working hours.",
      "Thank you for reaching out!",
      "PROJECT REQUEST RECEIVED",
      body
    ),
  };
}

// 2. VENDOR CONFIRMATION - with VendorLink WhatsApp instructions
function vendorConfirmation(vendor) {
  const body = `
    <p style="font-size:14.5px;color:${BRAND.textBody};line-height:1.8;margin:0 0 6px;">
      Dear Vendor,
    </p>
    <p style="font-size:14.5px;color:${BRAND.textBody};line-height:1.8;margin:0 0 6px;">
      Thank you for your interest in working with ${BRAND.name}. Your registration is with our procurement team.
    </p>
    ${detailCard([
      ["Company", vendor.company],
      ["Supplies", vendor.supplies],
      ["Phone", vendor.phone],
    ])}
    <p style="font-size:14.5px;color:${BRAND.textBody};line-height:1.8;margin:0 0 14px;">
      <strong style="color:${BRAND.textPrimary};">Next step:</strong> share your company portfolio, product catalogue and rate list on our VendorLink WhatsApp:
    </p>
    ${button(
      BRAND.vendorLinkWa,
      `<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/64px-WhatsApp.svg.png" width="18" height="18" alt="" style="vertical-align:-4px;margin-right:9px;border:0;">Share Portfolio`,
      "#25D366",
      "#0a0a0f"
    )}
    <p style="font-size:12px;color:${BRAND.textMuted};margin:2px 0 14px;">
      VendorLink: ${BRAND.vendorLinkNumber}
    </p>
    <p style="font-size:13px;color:${BRAND.textMuted};line-height:1.7;margin:8px 0 0;">
      Our team reaches out when there is a fit for an ongoing or upcoming project.
    </p>`;
  return {
    subject: `Vendor registration received - ${BRAND.name}`,
    html: layout(
      "Your vendor registration is with our procurement team - share your portfolio on VendorLink WhatsApp.",
      "Vendor Registration Received",
      "BKG VendorLink",
      body
    ),
  };
}

// 3. INTERNAL NOTIFICATION - to info@binkhalidgroup.com (vendors only;
//    client leads are tracked in HubSpot)
function internalNotification(kind, data) {
  const rows = [
    ["Company", data.company],
    ["Supplies", data.supplies],
    ["Phone", data.phone],
    ["Email", data.email],
    ["Source", "Website chat"],
  ];
  const body = `
    <p style="font-size:14.5px;color:${BRAND.textBody};line-height:1.8;margin:0;">
      A vendor registered through the website chat.
    </p>
    ${detailCard(rows)}`;
  return {
    subject: `[BKG Website] New Vendor Registration - ${data.company || ""}`,
    html: layout(
      "New vendor registration from the website.",
      "New Vendor Registration",
      "WEBSITE CHAT - VENDOR PATH",
      body
    ),
  };
}

module.exports = { clientConfirmation, vendorConfirmation, internalNotification };
