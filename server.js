const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: [
    "https://binkhalidgroup.com",
    "https://www.binkhalidgroup.com",
    "http://localhost:5500",
    "http://127.0.0.1:5500"
  ]
}));
app.use(express.json());

const WHATSAPP_API_URL = "https://graph.facebook.com/v25.0";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "1069499549576632";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || "contact_form_confirmation";

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "BKG WhatsApp API" });
});

app.post("/api/send-whatsapp", async (req, res) => {
  try {
    const { name, phone, services, city, area, projectSize } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, error: "Name and phone are required" });
    }
    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone) {
      return res.status(400).json({ success: false, error: "Invalid phone number format" });
    }
    const customerName = name.trim();
    const serviceList = services || "General Inquiry";
    const projectLocation = [city, area].filter(Boolean).join(", ") || "Not specified";
    const size = projectSize || "Not specified";
    const whatsappResponse = await sendWhatsAppTemplate(formattedPhone, customerName, serviceList, projectLocation, size);
    console.log("WhatsApp sent to " + formattedPhone + " for " + customerName);
    res.json({ success: true, message: "WhatsApp confirmation sent", messageId: whatsappResponse?.messages?.[0]?.id || null });
  } catch (error) {
    console.error("WhatsApp send error:", error.message);
    res.json({ success: false, error: "WhatsApp message could not be sent", detail: error.message });
  }
});

async function sendWhatsAppTemplate(to, name, service, location, size) {
  const url = WHATSAPP_API_URL + "/" + PHONE_NUMBER_ID + "/messages";
  const payload = {
    messaging_product: "whatsapp",
    to: to,
    type: "template",
    template: {
      name: TEMPLATE_NAME,
      language: { code: "en" },
      components: [{
        type: "body",
        parameters: [
          { type: "text", text: name },
          { type: "text", text: service },
          { type: "text", text: location },
          { type: "text", text: size }
        ]
      }]
    }
  };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Authorization": "Bearer " + ACCESS_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error("WhatsApp API Error " + response.status + ": " + JSON.stringify(data.error || data));
  }
  return data;
}

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
  console.log("BKG WhatsApp Server running on port " + PORT);
});
