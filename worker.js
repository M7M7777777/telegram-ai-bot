const ADMIN_ID = "1881579954";
const ADMIN_USERNAME = "@M7M7777777";

export default {
  async fetch(request, env) {
    try {
      const update = await request.json();

      // تشخیص نوع پیام (عادی یا بزنس)
      const msg = update.message || update.business_message;

      if (!msg || !msg.text) {
        return new Response("OK");
      }

      const isBusiness = !!update.business_message;
      const chatId = String(msg.chat.id);
      const fromId = String(msg.from.id);
      const text = msg.text.trim();

      // =========================
      // مدیریت از پیوی خود Bot
      // =========================
      if (!isBusiness) {
        if (text === "/admin") {
          if (fromId !== ADMIN_ID) {
            await sendMessage(
              env,
              chatId,
              `😂 نزدیک بود رفیق، ولی این تنظیمات دست هر کسی نیست.\nفقط ${ADMIN_USERNAME} می‌تونه تغییرش بده 😎`
            );
            return new Response("OK");
          }

          let settings = await env.BOT_SETTINGS.get("settings");

          if (!settings) {
            settings = {
              model: "groq",
              personality: "friendly",
              memory: true,
            };
            await env.BOT_SETTINGS.put("settings", JSON.stringify(settings));
          } else {
            settings = JSON.parse(settings);
          }

          await sendMessage(
            env,
            chatId,
            `⚙️ پنل مدیریت\n\n🤖 مدل:\n${settings.model}\n\n🧠 حافظه:\n${
              settings.memory ? "روشن ✅" : "خاموش ❌"
            }\n\n🎭 شخصیت:\n${settings.personality}`
          );

          return new Response("OK");
        }

        // پیام‌های عادی پیوی Bot
        await sendMessage(
          env,
          chatId,
          "😎 این بخش برای مدیریت رباته. از /admin استفاده کن."
        );
        return new Response("OK");
      }

      return new Response("OK");
    } catch (error) {
      console.error("Error processing update:", error);
      return new Response("OK");
    }
  },
};

// تابع کمکی ارسال پیام به تلگرام
async function sendMessage(env, chatId, text, businessConnectionId = null) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text: text,
  };

  if (businessConnectionId) {
    payload.business_connection_id = businessConnectionId;
  }

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
