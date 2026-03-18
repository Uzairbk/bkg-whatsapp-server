const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const WHATSAPP_API_URL = "https://graph.facebook.com/v25.0";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "1069499549576632";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || "contact_form_confirmation";
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || "bkg_whatsapp_verify_2024";

// Auto-reply message for incoming customer messages
const AUTO_REPLY_MESSAGE = `Thank you for contacting Bin Khalid Group.

This is an automated response, and messages sent to this number will not be received. One of our representatives will reach out to you soon.

For urgent inquiries, please contact us directly:
\u{1F4DE} Phone: 042-35133492
\u{1F4F1} Mobile: 0345-9436328

\u{1F552} Hours: Monday to Saturday, 10:00 AM \u{2013} 6:00 PM`;

// Track recently replied numbers to avoid spamming (reply once per 24 hours)
const repliedNumbers = new Map();
const REPLY_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "BKG WhatsApp API" });
});

// ============================================
// WEBHOOK - Verify endpoint (Meta sends GET)
// ============================================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
    console.log("Webhook verified successfully");
    return res.status(200).send(challenge);
  }

  console.log("Webhook verification failed");
  return res.sendStatus(403);
});

// ============================================
// WEBHOOK - Receive incoming messages (Meta sends POST)
// ============================================
app.post("/webhook", async (req, res) => {
  // Always respond 200 quickly to Meta
  res.sendStatus(200);

  try {
    const body = req.body;

    if (
      body.object === "whatsapp_business_account" &&
      body.entry &&
      body.entry.length > 0
    ) {
      for (const entry of body.entry) {
        const changes = entry.changes || [];
        for (const change of changes) {
          if (change.field !== "messages") continue;

          const messages = change.value?.messages || [];
          for (const message of messages) {
            const from = message.from;
            const customerName =
              change.value?.contacts?.[0]?.profile?.name || "Customer";
            const msgType = message.type;
            const msgBody =
              message.type === "text" ? message.text?.body : `[${msgType}]`;

            console.log(
              `Incoming from ${customerName} (${from}): ${msgBody}`
            );

            // Check cooldown - only auto-reply once per 24 hours per number
            const lastReplied = repliedNumbers.get(from);
            const now = Date.now();

            if (lastReplied && now - lastReplied < REPLY_COOLDOWN) {
              console.log(
                `Skipping auto-reply to ${from} - already replied within 24 hours`
              );
              continue;
            }

            // Send auto-reply
            await sendAutoReply(from);
            repliedNumbers.set(from, now);
            console.log(`Auto-reply sent to ${from}`);

            // Clean up old entries from map (memory management)
            for (const [number, timestamp] of repliedNumbers) {
              if (now - timestamp > REPLY_COOLDOWN) {
                repliedNumbers.delete(number);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Webhook processing error:", error.message);
  }
});

// ============================================
// Send auto-reply text message
// ============================================
async function sendAutoReply(to) {
  const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: to,
    type: "text",
    text: {
      body: AUTO_REPLY_MESSAGE,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `WhatsApp API Error ${response.status}: ${JSON.stringify(data.error || data)}`
    );
  }

  return data;
}

// ============================================
// OUTBOUND - Send template message (existing functionality)
// ============================================
app.post("/api/send-whatsapp", async (req, res) => {
  try {
    const { name, phone, services, city, area, projectSize } = req.body;

    if (!name || !phone) {
      return res
        .status(400)
        .json({ success: false, error: "Name and phone are required" });
    }

    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid phone number format" });
    }

    const customerName = name.trim();
    const serviceList = services || "General Inquiry";
    const projectLocation =
      [city, area].filter(Boolean).join(", ") || "Not specified";
    const size = projectSize || "Not specified";

    const whatsappResponse = await sendWhatsAppTemplate(
      formattedPhone,
      customerName,
      serviceList,
      projectLocation,
      size
    );

    console.log(`WhatsApp sent to ${formattedPhone} for ${customerName}`);

    res.json({
      success: true,
      message: "WhatsApp confirmation sent",
      messageId: whatsappResponse?.messages?.[0]?.id || null,
    });
  } catch (error) {
    console.error("WhatsApp send error:", error.message);
    res.json({
      success: false,
      error: "WhatsApp message could not be sent",
      detail: error.message,
    });
  }
});

// ============================================
// Send WhatsApp template message
// ============================================
async function sendWhatsAppTemplate(to, name, service, location, size) {
  const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: to,
    type: "template",
    template: {
      name: TEMPLATE_NAME,
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: name },
            { type: "text", text: service },
            { type: "text", text: location },
            { type: "text", text: size },
          ],
        },
      ],
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `WhatsApp API Error ${response.status}: ${JSON.stringify(data.error || data)}`
    );
  }

  return data;
}

// ============================================
// Utility: Format phone number to international format
// ============================================
function formatPhoneNumber(phone) {
  let digits = phone.replace(/\\D/g, "");

  if (digits.startsWith("0") && digits.length === 11) {
    digits = "92" + digits.substring(1);
  }

  if (digits.length === 10 && !digits.startsWith("92")) {
    digits = "92" + digits;
  }

  if (digits.length < 10 || digits.length > 15) {
    return null;
  }

  return digits;
}

app.listen(PORT, () => {
  console.log(`BKG WhatsApp Server running on port ${PORT}`);
});
