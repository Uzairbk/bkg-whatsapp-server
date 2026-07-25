// BKG Email Templates - used by server.js
// All emails sent from info@binkhalidgroup.com

const BRAND = {
  name: "Bin Khalid Group",
  logo: "https://bkg.world/wp-content/uploads/2024/04/Logo-For-web2-copy.webp",
  accent: "#b5764a",
  dark: "#141414",
  phone: "042-35133492",
  mobile: "0345-9436328",
  website: "https://binkhalidgroup.com",
  vendorLinkNumber: "0340 8442904",
  vendorLinkWa: "https://wa.me/923408442904",
};

function layout(title, bodyHtml) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f2ef;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ef;padding:30px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:${BRAND.dark};padding:26px 40px;" align="center">
            <img src="${BRAND.logo}" alt="${BRAND.name}" height="42" style="display:block;">
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px 10px;">
            <h1 style="margin:0 0 18px;font-size:21px;color:#141414;">${title}</h1>
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px 32px;">
            <p style="margin:0 0 4px;font-size:13px;color:#555;">Warm regards,</p>
            <p style="margin:0;font-size:14px;font-weight:bold;color:#141414;">Team ${BRAND.name}</p>
            <p style="margin:14px 0 0;font-size:12px;color:#888;line-height:1.7;">
              Phone: ${BRAND.phone} &nbsp;|&nbsp; Mobile: ${BRAND.mobile}<br>
              <a href="${BRAND.website}" style="color:${BRAND.accent};text-decoration:none;">binkhalidgroup.com</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#faf8f6;padding:16px 40px;border-top:1px solid #eee;" align="center">
            <p style="margin:0;font-size:11px;color:#aaa;">Lahore's premier design + build company. Serving DHA, Bahria Town, and Gulberg since 2013.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function detailRows(pairs) {
  const rows = pairs
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr>
          <td style="padding:8px 14px;font-size:13px;color:#888;border-bottom:1px solid #f0ece8;white-space:nowrap;">${k}</td>
          <td style="padding:8px 14px;font-size:13px;color:#141414;font-weight:bold;border-bottom:1px solid #f0ece8;">${v}</td>
        </tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f6;border-radius:8px;margin:18px 0;">${rows}</table>`;
}

// 1. CLIENT CONFIRMATION - after form or chat submission
function clientConfirmation(lead) {
  const firstName = (lead.name || "").trim().split(" ")[0] || "there";
  const body = `
    <p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 6px;">
      Dear ${firstName},
    </p>
    <p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 6px;">
      Thank you for contacting ${BRAND.name}. We have received your project details and the right specialist from our team will call you within <strong>48 working hours</strong>.
    </p>
    ${detailRows([
      ["Services", lead.services],
      ["Project Type", lead.projectType],
      ["Location", lead.location],
      ["Plot / Property Size", lead.projectSize],
      ["Timeline", lead.timeline],
    ])}
    <p style="font-size:13px;color:#666;line-height:1.7;margin:0;">
      Meanwhile, feel free to explore our portfolio at
      <a href="${BRAND.website}" style="color:${BRAND.accent};">binkhalidgroup.com</a>
      or message us on WhatsApp at ${BRAND.mobile} for anything urgent.
    </p>`;
  return {
    subject: `We've received your project details - ${BRAND.name}`,
    html: layout("Thank you for reaching out!", body),
  };
}

// 2. VENDOR CONFIRMATION - with VendorLink WhatsApp instructions
function vendorConfirmation(vendor) {
  const body = `
    <p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 6px;">
      Dear Vendor,
    </p>
    <p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 6px;">
      Thank you for your interest in working with ${BRAND.name}. We have received your registration and our procurement team will review it.
    </p>
    ${detailRows([
      ["Company", vendor.company],
      ["Supplies", vendor.supplies],
      ["Phone", vendor.phone],
    ])}
    <p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 16px;">
      <strong>Next step:</strong> please share your company portfolio, product catalogue, and rate list on our <strong>VendorLink WhatsApp</strong>:
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
      <tr><td style="background:#25D366;border-radius:8px;">
        <a href="${BRAND.vendorLinkWa}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;">
          VendorLink WhatsApp: ${BRAND.vendorLinkNumber}
        </a>
      </td></tr>
    </table>
    <p style="font-size:13px;color:#666;line-height:1.7;margin:0;">
      Our team reaches out when there is a fit for an ongoing or upcoming project. We appreciate your interest in working with us.
    </p>`;
  return {
    subject: `Vendor registration received - ${BRAND.name}`,
    html: layout("Vendor Registration Received", body),
  };
}

// 3. INTERNAL NOTIFICATION - to info@binkhalidgroup.com
function internalNotification(kind, data) {
  const isVendor = kind === "vendor";
  const title = isVendor ? "New Vendor Registration" : `New ${data.source === "chat" ? "Chat" : "Form"} Lead`;
  const rows = isVendor
    ? [
        ["Company", data.company],
        ["Supplies", data.supplies],
        ["Phone", data.phone],
        ["Email", data.email],
        ["Source", "Website chat"],
      ]
    : [
        ["Name", data.name],
        ["Phone", data.phone],
        ["Email", data.email],
        ["Services", data.services],
        ["Project Type", data.projectType],
        ["Location", data.location],
        ["Plot / Size", data.projectSize],
        ["Timeline", data.timeline],
        ["Note", data.note],
        ["Source", data.source || "website"],
      ];
  const body = `
    <p style="font-size:14px;color:#444;line-height:1.7;margin:0;">
      ${isVendor ? "A vendor registered through the website chat." : "A new lead just came in from the website. Speed matters - call within 5 minutes for the best conversion."}
    </p>
    ${detailRows(rows)}`;
  return {
    subject: `[BKG Website] ${title}${isVendor ? ` - ${data.company || ""}` : ` - ${data.name || ""}`}`,
    html: layout(title, body),
  };
}

module.exports = { clientConfirmation, vendorConfirmation, internalNotification };
