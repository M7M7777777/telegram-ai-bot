const ADMIN_ID = "1881579954";

export default {
  async fetch(request, env) {
    try {
      const update = await request.json();

      // ۱. بررسی نوع پیام (عادی یا بیزینس)
      const isBusiness = !!update.business_message;
      const msg = update.message || update.business_message;

      if (!msg || !msg.text) {
        return new Response("OK");
      }

      const chatId = msg.chat.id;
      const senderId = String(msg.from.id);
      const text = msg.text.trim();
      const businessConnectionId = isBusiness ? msg.business_connection_id : null;

      // ===================================================
      // 🛑 قانون اصلی بیزینس: تشخیص پیام شخصیِ صاحب اکانت
      // ===================================================
      if (isBusiness) {
        // اگر پیام از طرف ربات‌ها یا خود ربات باشه رد میشه
        if (msg.from.is_bot) {
          return new Response("OK");
        }

        // اگر صاحب اکانت خودش داره توی چت تایپ می‌کنه -> ربات پاسخ نمی‌دهد
        if (msg.out || (msg.from && msg.from.id === msg.chat.id)) {
          return new Response("OK");
        }
      }

      // ===================================================
      // ⚙️ دستورات مدیریتی (فقط در پیویِ مستقیمِ ربات)
      // ===================================================
      if (!isBusiness && text === "/admin") {
        if (senderId !== ADMIN_ID) {
          await sendTelegram(env, chatId, "⛔ دسترسی نداری.");
          return new Response("OK");
        }

        await sendTelegram(
          env,
          chatId,
          "⚙️ پنل مدیریت\n\n🤖 مدل: Groq (Llama 3.1)\n🧠 وضعیت: فعال و آماده کار"
        );
        return new Response("OK");
      }

      // پیام‌های عادی پیوی ربات که دستور نیستند
      if (!isBusiness) {
        await sendTelegram(env, chatId, "😎 برای مدیریت ربات از دستور /admin استفاده کن.");
        return new Response("OK");
      }

      // ===================================================
      // 🤖 پاسخ هوش مصنوعی (فقط به مشتریان توی بیزینس چت)
      // ===================================================
      const answer = await askGroq(env, text);
      await sendTelegram(env, chatId, answer, businessConnectionId);

      return new Response("OK");

    } catch (error) {
      console.error("Worker Error:", error);
      return new Response("OK");
    }
  }
};

async function sendTelegram(env, chatId, text, businessConnectionId = null) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  const body = {
    chat_id: chatId,
    text: text
  };

  if (businessConnectionId) {
    body.business_connection_id = businessConnectionId;
  }

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function askGroq(env, message) {
  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content: "تو یک دستیار فارسی دوستانه و محترم هستی. خلاصه و مفید پاسخ بده."
            },
            {
              role: "user",
              content: message
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!data.choices || !data.choices[0]) {
      return "❌ خطا در دریافت پاسخ از هوش مصنوعی.";
    }

    return data.choices[0].message.content;
  } catch (err) {
    return "❌ خطا در برقراری ارتباط با سرور.";
  }
}
