import express from "express";
import path from "path";
import fs from "fs";
import https from "https";
import { createServer as createViteServer } from "vite";
import webpush from "web-push";
import nodemailer from "nodemailer";

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));

  const PORT = 3000;
  const DATA_DIR = path.join(process.cwd(), "data");

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Serve generated Open Graph preview image
  app.get(["/og-image.png", "/og-image.jpg"], (req, res) => {
    const imgPath = path.join(process.cwd(), "src/assets/images/og_image_night_1784134292521.jpg");
    if (fs.existsSync(imgPath)) {
      res.sendFile(imgPath);
    } else {
      res.status(404).send("Not found");
    }
  });

  // Helper to send real emails via Brevo SMTP API or fall back safely to console simulation
  const sendBrevoOTP = (toEmail: string, code: string, userName: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const brevoApiKey = process.env.BREVO_API_KEY || "";
      const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL || "support@jadwalni.com";
      const brevoSenderName = process.env.BREVO_SENDER_NAME || "منصة جدولني للقدرات";

      if (!brevoApiKey) {
        console.log(`\n======================================================`);
        console.log(`[SECURITY WARNING] BREVO_API_KEY is not configured in .env!`);
        console.log(`[SIMULATION MODE] Verification code for ${toEmail} is: ${code}`);
        console.log(`======================================================\n`);
        return resolve(false); // Not configured - will log and fail over to simulation
      }

      const postData = JSON.stringify({
        sender: {
          name: brevoSenderName,
          email: brevoSenderEmail
        },
        to: [
          {
            email: toEmail,
            name: userName
          }
        ],
        subject: "كود التحقق الخاص بك لإعادة تعيين كلمة المرور - جدولني",
        htmlContent: `
          <div dir="rtl" style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff; text-align: right;">
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #bf9b30; padding-bottom: 15px;">
              <h2 style="color: #0c1a30; margin: 0; font-size: 24px;">منصة جدولني للقدرات</h2>
              <p style="color: #bf9b30; font-weight: bold; margin: 5px 0 0 0;">كود التحقق الأمني لإعادة تعيين كلمة المرور</p>
            </div>
            
            <p style="color: #333333; font-size: 15px;">أهلاً بطلنا المتفوق <strong>${userName}</strong>،</p>
            
            <p style="line-height: 1.6; color: #4a4a4a; font-size: 14px;">
              لقد تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك المسجل على منصة <strong>جدولني للقدرات</strong>. 
              يرجى استخدام كود التحقق السري التالي لإتمام عملية التعيين بنجاح:
            </p>
            
            <div style="background-color: #f7f9fc; border: 1px dashed #bf9b30; border-radius: 8px; padding: 15px; text-align: center; margin: 25px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0c1a30; font-family: monospace;">${code}</span>
            </div>
            
            <p style="font-size: 12px; color: #888888; line-height: 1.6;">
              ⚠️ <strong>ملاحظات هامة:</strong><br>
              * كود التحقق هذا صالح للاستخدام لمدة <strong>10 دقائق فقط</strong> من تاريخ إرساله.<br>
              * كود التحقق هذا صالح لعدد <strong>5 محاولات كحد أقصى</strong> قبل أن يتم إلغاؤه تلقائياً لدواعي الأمان.<br>
              * لا تقم بمشاركة هذا الكود مع أي شخص لحماية حسابك من السرقة والعبث بجداولك الدراسية.<br>
              * إذا لم تكن أنت من قام بهذا الطلب، فيرجى تجاهل هذا الإيميل تماماً وسيبقى حسابك محمي بالكامل.
            </p>
            
            <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
            
            <div style="text-align: center; font-size: 11px; color: #aaaaaa;">
              © 2026 منصة جدولني للقدرات - نسير معك نحو الـ 100٪ بكل أمان وسرية.
            </div>
          </div>
        `
      });

      const options = {
        hostname: "api.brevo.com",
        port: 443,
        path: "/v3/smtp/email",
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": brevoApiKey,
          "content-type": "application/json",
          "Content-Length": Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let responseBody = "";
        res.on("data", (chunk) => {
          responseBody += chunk;
        });

        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`[Brevo SMTP] Verification email sent successfully to ${toEmail}`);
            resolve(true);
          } else {
            console.error(`[Brevo SMTP Error] Failed with status ${res.statusCode}: ${responseBody}`);
            resolve(false);
          }
        });
      });

      req.on("error", (error) => {
        console.error("[Brevo SMTP Exception] Failed to send verification email:", error);
        resolve(false);
      });

      req.write(postData);
      req.end();
    });
  };

  // Initialize VAPID Keys for Web Push Notifications
  const VAPID_FILE = path.join(DATA_DIR, "vapid.json");
  let vapidKeys: { publicKey: string; privateKey: string };

  if (fs.existsSync(VAPID_FILE)) {
    try {
      vapidKeys = JSON.parse(fs.readFileSync(VAPID_FILE, "utf-8"));
    } catch (e) {
      vapidKeys = webpush.generateVAPIDKeys();
      fs.writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys, null, 2), "utf-8");
    }
  } else {
    vapidKeys = webpush.generateVAPIDKeys();
    fs.writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys, null, 2), "utf-8");
  }

  webpush.setVapidDetails(
    "mailto:support@jadwalni.com",
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );

  const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, "push_subscriptions.json");

  // In-memory cache for ultra-fast, zero-delay lookups
  let subscriptionsCache: any[] = [];
  let isCacheInitialized = false;

  function loadSubscriptionsCache() {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
      try {
        const raw = JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, "utf-8"));
        if (Array.isArray(raw)) {
          const unique: any[] = [];
          const seenEndpoints = new Set<string>();
          const seenKeys = new Set<string>();
          for (const s of raw) {
            if (s) {
              const endpoint = s.endpoint || (s.subscription && s.subscription.endpoint);
              const p256dh = s.subscription && s.subscription.keys && s.subscription.keys.p256dh;
              
              if (endpoint && !seenEndpoints.has(endpoint)) {
                if (p256dh) {
                  if (seenKeys.has(p256dh)) {
                    continue; // Skip duplicate browser sessions
                  }
                  seenKeys.add(p256dh);
                }
                seenEndpoints.add(endpoint);
                unique.push(s);
              }
            }
          }
          subscriptionsCache = unique;
        } else {
          subscriptionsCache = [];
        }
      } catch (e) {
        subscriptionsCache = [];
      }
    } else {
      subscriptionsCache = [];
    }
    isCacheInitialized = true;
  }

  function getSubscriptions(): any[] {
    if (!isCacheInitialized) {
      loadSubscriptionsCache();
    }
    return subscriptionsCache;
  }

  function saveSubscriptions(subs: any[]) {
    // Deduplicate on save to guarantee absolute uniqueness
    const unique: any[] = [];
    const seenEndpoints = new Set<string>();
    const seenKeys = new Set<string>();
    for (const s of subs) {
      if (s) {
        const endpoint = s.endpoint || (s.subscription && s.subscription.endpoint);
        const p256dh = s.subscription && s.subscription.keys && s.subscription.keys.p256dh;
        
        if (endpoint && !seenEndpoints.has(endpoint)) {
          if (p256dh) {
            if (seenKeys.has(p256dh)) {
              continue;
            }
            seenKeys.add(p256dh);
          }
          seenEndpoints.add(endpoint);
          unique.push(s);
        }
      }
    }

    subscriptionsCache = unique;
    isCacheInitialized = true;
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(unique, null, 2), "utf-8");
  }

  // Helper to get safe filename for email
  function getFilePathForEmail(email: string): string {
    const safeEmail = email.toLowerCase().replace(/[^a-z0-9@.]/g, "_");
    return path.join(DATA_DIR, `user_${safeEmail}.json`);
  }

  // API Route to register a new user
  app.post("/api/auth/signup", (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "الرجاء إدخال البريد الإلكتروني وكلمة المرور والاسم" });
    }

    const usersFilePath = path.join(DATA_DIR, "users.json");
    let users = [];
    if (fs.existsSync(usersFilePath)) {
      try {
        users = JSON.parse(fs.readFileSync(usersFilePath, "utf-8"));
      } catch (e) {
        users = [];
      }
    }

    const emailLower = email.toLowerCase().trim();
    if (users.some((u: any) => u.email.toLowerCase().trim() === emailLower)) {
      return res.status(400).json({ error: "هذا البريد الإلكتروني مسجل بالفعل، الرجاء تسجيل الدخول" });
    }

    const newUser = {
      id: "usr_" + Math.random().toString(36).substr(2, 9),
      email: emailLower,
      password: password,
      name: name.trim(),
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    try {
      fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), "utf-8");
      return res.json({ user: { id: newUser.id, email: newUser.email, name: newUser.name } });
    } catch (err) {
      return res.status(500).json({ error: "فشل في حفظ بيانات التسجيل" });
    }
  });

  // In-memory store for password reset verification codes
  const resetCodes = new Map<string, { code: string; expires: number; attempts: number }>();

  // API Route to login a user
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "الرجاء إدخال البريد الإلكتروني وكلمة المرور" });
    }

    const usersFilePath = path.join(DATA_DIR, "users.json");
    let users = [];
    if (fs.existsSync(usersFilePath)) {
      try {
        users = JSON.parse(fs.readFileSync(usersFilePath, "utf-8"));
      } catch (e) {
        users = [];
      }
    }

    const emailLower = email.toLowerCase().trim();
    const found = users.find((u: any) => u.email.toLowerCase().trim() === emailLower);
    
    if (!found) {
      return res.status(400).json({ error: "الجيميل أو الباسورد خطأ" });
    }

    if (found.password !== password) {
      return res.status(400).json({ error: "الجيميل أو الباسورد خطأ" });
    }

    return res.json({ user: { id: found.id, email: found.email, name: found.name } });
  });

  // API Route for Forgot Password
  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "الرجاء إدخال البريد الإلكتروني" });
    }

    const usersFilePath = path.join(DATA_DIR, "users.json");
    let users = [];
    if (fs.existsSync(usersFilePath)) {
      try {
        users = JSON.parse(fs.readFileSync(usersFilePath, "utf-8"));
      } catch (e) {
        users = [];
      }
    }

    const emailLower = email.toLowerCase().trim();
    const found = users.find((u: any) => u.email.toLowerCase().trim() === emailLower);

    if (!found) {
      return res.status(400).json({ error: "لا يوجد حساب مرتبط بهذا البريد الإلكتروني." });
    }

    // Generate a secure 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save/Overwrite the verification code in database (in-memory store)
    // Overwriting the previous record cancels any old codes and resets attempts to 0
    resetCodes.set(emailLower, {
      code,
      expires: Date.now() + 10 * 60 * 1000, // Valid for exactly 10 minutes
      attempts: 0 // Start with 0 failed attempts
    });

    // Log the reset code on the server console securely for testing/debugging
    console.log(`[SECURITY INFO] Reset password code generated for ${emailLower}: ${code}`);

    // Try sending actual email via Brevo SMTP
    const sent = await sendBrevoOTP(emailLower, code, found.name || "طالبنا المتفوق");

    return res.json({ 
      success: true, 
      message: sent 
        ? "تم إرسال كود التحقق السري إلى بريدك الإلكتروني بنجاح! يرجى مراجعة صندوق الوارد (أو صندوق الرسائل غير المرغوب فيها Spam)."
        : "تم تقديم طلب إعادة تعيين كلمة المرور بنجاح. يرجى التواصل مع الدعم لتلقي الرمز أو إعداد مفتاح Brevo الخاص بك.",
      emailSent: sent
    });
  });

  // API Route to Reset Password using the verification code
  app.post("/api/auth/reset-password", (req, res) => {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: "الرجاء إدخال جميع الحقول المطلوبة" });
    }

    const emailLower = email.toLowerCase().trim();
    const record = resetCodes.get(emailLower);

    if (!record) {
      return res.status(400).json({ error: "لم يتم طلب رمز تحقق لهذا البريد الإلكتروني أو انتهت صلاحيته. يرجى طلب رمز جديد." });
    }

    // 1. Check expiration (10 minutes limit)
    if (Date.now() > record.expires) {
      resetCodes.delete(emailLower); // Delete expired code
      return res.status(400).json({ error: "انتهت صلاحية رمز التحقق (10 دقائق). يرجى طلب رمز جديد." });
    }

    // 2. Check failed attempts (Max 5 attempts allowed)
    if (record.attempts >= 5) {
      resetCodes.delete(emailLower); // Invalidate completely
      return res.status(400).json({ error: "لقد تجاوزت الحد الأقصى للمحاولات المسموح بها (5 محاولات). يرجى طلب كود جديد." });
    }

    // 3. Verify correctness of the code
    if (record.code !== code.trim()) {
      record.attempts += 1;
      
      if (record.attempts >= 5) {
        resetCodes.delete(emailLower); // Force delete on 5th failure
        return res.status(400).json({ 
          error: "لقد تجاوزت الحد الأقصى للمحاولات المسموح بها (5 محاولات). يرجى طلب كود جديد." 
        });
      } else {
        resetCodes.set(emailLower, record); // Save incremented attempts
        return res.status(400).json({ 
          error: `كود التحقق غير صحيح. متبقي لديك ${5 - record.attempts} محاولات.` 
        });
      }
    }

    // 4. Update the user password in the users database
    const usersFilePath = path.join(DATA_DIR, "users.json");
    let users = [];
    if (fs.existsSync(usersFilePath)) {
      try {
        users = JSON.parse(fs.readFileSync(usersFilePath, "utf-8"));
      } catch (e) {
        users = [];
      }
    }

    const userIndex = users.findIndex((u: any) => u.email.toLowerCase().trim() === emailLower);
    if (userIndex === -1) {
      return res.status(400).json({ error: "المستخدم غير موجود" });
    }

    users[userIndex].password = newPassword;
    try {
      fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), "utf-8");
      
      // Delete the OTP immediately on success so it cannot be reused
      resetCodes.delete(emailLower);
      
      return res.json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
    } catch (err) {
      return res.status(500).json({ error: "فشل في حفظ كلمة المرور الجديدة" });
    }
  });

  // API Route to permanently delete a user's account and all associated data
  app.post("/api/auth/delete-account", (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "البريد الإلكتروني مطلوب لحذف الحساب" });
    }

    const emailLower = email.toLowerCase().trim();
    const usersFilePath = path.join(DATA_DIR, "users.json");
    let users = [];
    if (fs.existsSync(usersFilePath)) {
      try {
        users = JSON.parse(fs.readFileSync(usersFilePath, "utf-8"));
      } catch (e) {
        users = [];
      }
    }

    const filteredUsers = users.filter((u: any) => u.email.toLowerCase().trim() !== emailLower);
    
    try {
      fs.writeFileSync(usersFilePath, JSON.stringify(filteredUsers, null, 2), "utf-8");
      
      // Delete user data file if it exists
      const userDataFilePath = getFilePathForEmail(emailLower);
      if (fs.existsSync(userDataFilePath)) {
        fs.unlinkSync(userDataFilePath);
      }
      
      return res.json({ success: true, message: "تم حذف الحساب وجميع البيانات المرتبطة به نهائياً بنجاح" });
    } catch (err) {
      return res.status(500).json({ error: "فشل في إتمام عملية حذف الحساب" });
    }
  });

  // API Route to fetch notifications
  app.get("/api/notifications", (req, res) => {
    const notificationsFilePath = path.join(DATA_DIR, "notifications.json");
    let notifications = [];

    if (fs.existsSync(notificationsFilePath)) {
      try {
        notifications = JSON.parse(fs.readFileSync(notificationsFilePath, "utf-8"));
      } catch (e) {
        notifications = [];
      }
    }

    // If empty or file doesn't exist, write defaults
    if (notifications.length === 0) {
      notifications = [
        {
          id: "notif-system-4",
          title: "حذف الحساب نهائياً 🗑️",
          text: "تم إضافة ميزة حذف الحساب نهائياً من البروفايل وتأكيده بعبارة 'حذف الحساب' لضمان السيطرة والأمان الكامل لبياناتك الشخصية.",
          time: "الآن",
          isNew: true,
          createdAt: Date.now()
        },
        {
          id: "notif-system-1",
          title: "نظام السلسلة اليومية (Streak) 🔥",
          text: "تم تفعيل نظام الـ Streak الجديد في البروفايل! عندما تنجز كافة مهام يومك الدراسي، يمكنك تسجيل إنجازك لزيادة السلسلة المتتالية والعودة لجدولك تلقائياً.",
          time: "أمس، الساعة 8:30 م",
          isNew: true,
          createdAt: Date.now() - 24 * 60 * 60 * 1000
        },
        {
          id: "notif-system-2",
          title: "تحسينات مظهر الوضع الداكن 🌙",
          text: "تم حل مشاكل تباين النصوص وتنسيق الألوان في الوضع الداكن، خصوصاً في صفحة الدعم الفني وحسابات التواصل لتصبح مريحة ومقروءة بشكل ممتاز.",
          time: "أمس، الساعة 4:15 م",
          isNew: true,
          createdAt: Date.now() - 28 * 60 * 60 * 1000
        },
        {
          id: "notif-system-3",
          title: "تحديث توليد صور الجدول 📸",
          text: "تمت ترقية منشئ صور الجداول ليكون مخصصاً وجاهزاً للمشاركة! تظهر الصور الآن مع إعدادات حساب آسر (Asser / o1v__asser) المميزة.",
          time: "أمس، الساعة 11:10 ص",
          isNew: true,
          createdAt: Date.now() - 32 * 60 * 60 * 1000
        },
        {
          id: "notif-legacy-1",
          title: "تحديث النظام 🚀",
          text: "تم تحسين محرك توليد الصور بالكامل! الآن يتم ترتيب الأيام ومحاذاة المهام بدقة فائقة لتناسب طباعتك ومشاركتها.",
          time: "منذ يومين",
          isNew: false,
          createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000
        },
        {
          id: "notif-legacy-2",
          title: "سر الـ 100٪ 🤍",
          text: "تم تفعيل 'سجل الأخطاء المتراكمة المباشر' في تفاصيل الجداول لمراجعة جميع أسئلتك الصعبة فورا وتثبيتها.",
          time: "منذ 3 أيام",
          isNew: false,
          createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000
        },
        {
          id: "notif-legacy-3",
          title: "نصيحة ذهبية من آسر 🎓",
          text: "أهلاً بك، لا تشيل هم تكرار الأخطاء بالبداية، فكل خطأ تصححه وتتعلم فكرته هو خطوة حقيقية تضمن بها الـ 100٪ بإذن الله!",
          time: "منذ أسبوع",
          isNew: false,
          createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000
        }
      ];

      try {
        fs.writeFileSync(notificationsFilePath, JSON.stringify(notifications, null, 2), "utf-8");
      } catch (err) {
        // ignore
      }
    }

    return res.json(notifications);
  });

  // API Route to add a new notification/update (restricted to admin email)
  app.post("/api/notifications", (req, res) => {
    const { email, title, text } = req.body;
    if (!email || !title || !text) {
      return res.status(400).json({ error: "البريد الإلكتروني، العنوان، والنص مطلوبون" });
    }

    const emailLower = email.toLowerCase().trim();
    if (emailLower !== "asserosama5533@gmail.com") {
      return res.status(403).json({ error: "عذراً، هذا الإجراء متاح فقط لمطور المنصة آسر أسامة" });
    }

    const notificationsFilePath = path.join(DATA_DIR, "notifications.json");
    let notifications = [];

    if (fs.existsSync(notificationsFilePath)) {
      try {
        notifications = JSON.parse(fs.readFileSync(notificationsFilePath, "utf-8"));
      } catch (e) {
        notifications = [];
      }
    }

    const newNotif = {
      id: "notif-" + Date.now(),
      title: title.trim(),
      text: text.trim(),
      time: "الآن",
      isNew: true,
      createdAt: Date.now()
    };

    // Add new notification at the top of the array
    notifications.unshift(newNotif);

    try {
      fs.writeFileSync(notificationsFilePath, JSON.stringify(notifications, null, 2), "utf-8");
      return res.json({ success: true, notification: newNotif });
    } catch (err) {
      return res.status(500).json({ error: "فشل في حفظ الإشعار الجديد" });
    }
  });

  // API Route to auto-restore a user's account if it was wiped on the server
  app.post("/api/auth/auto-restore", (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "الرجاء إدخال البريد الإلكتروني وكلمة المرور والاسم" });
    }

    const usersFilePath = path.join(DATA_DIR, "users.json");
    let users = [];
    if (fs.existsSync(usersFilePath)) {
      try {
        users = JSON.parse(fs.readFileSync(usersFilePath, "utf-8"));
      } catch (e) {
        users = [];
      }
    }

    const emailLower = email.toLowerCase().trim();
    const found = users.find((u: any) => u.email.toLowerCase().trim() === emailLower);

    if (!found) {
      // Auto-recreate the user entry in users.json
      const newUser = {
        id: "usr_" + Math.random().toString(36).substr(2, 9),
        email: emailLower,
        password: password,
        name: name.trim(),
        createdAt: new Date().toISOString()
      };
      users.push(newUser);
      try {
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), "utf-8");
        return res.json({ restored: true, user: { id: newUser.id, email: newUser.email, name: newUser.name } });
      } catch (err) {
        return res.status(500).json({ error: "فشل في حفظ بيانات الاستعادة" });
      }
    }

    return res.json({ restored: false, user: { id: found.id, email: found.email, name: found.name } });
  });

  // API Route to load user-specific data via registered email
  app.get("/api/user-data", (req, res) => {
    const { email } = req.query;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    const filePath = getFilePathForEmail(email);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        return res.json(JSON.parse(content));
      } catch (err) {
        return res.status(500).json({ error: "Failed to read user data" });
      }
    } else {
      // Default initial state for a new user email
      return res.json({
        email,
        profile: null,
        schedules: [],
        errors: [],
        progress: {}
      });
    }
  });

  // API Route to store user-specific data via registered email
  app.post("/api/user-data", (req, res) => {
    const { email, data } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    const filePath = getFilePathForEmail(email);
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Failed to save user data" });
    }
  });

  // Web Manifest route for Progressive Web App (PWA) support (crucial for iOS push/notifications)
  app.get("/manifest.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send({
      name: "جدولني للقدرات - جدول مذاكرة ذكي",
      short_name: "جدولني",
      description: "صانع جداول مذاكرة ذكي وتفاعلي لاجتياز اختبار القدرات بنسبة 100% مع منبه يومي مميز.",
      start_url: "/",
      display: "standalone",
      background_color: "#0f172a",
      theme_color: "#0f172a",
      icons: [
        {
          src: "/favicon.ico",
          sizes: "64x64 32x32 24x24 16x16",
          type: "image/x-icon"
        }
      ]
    });
  });

  // Web Push VAPID Public Key API
  app.get("/api/push/vapid-public-key", (req, res) => {
    return res.json({ publicKey: vapidKeys.publicKey });
  });

  // Subscribe to push notifications API
  app.post("/api/push/subscribe", (req, res) => {
    const { subscription, timezone, email, reminderTimes } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: "Subscription endpoint is required" });
    }

    const subs = getSubscriptions();
    const index = subs.findIndex((s: any) => s.endpoint === subscription.endpoint);

    const newSub = {
      endpoint: subscription.endpoint,
      subscription,
      timezone: timezone || "Asia/Riyadh",
      email: email || null,
      reminderTimes: reminderTimes || [],
      updatedAt: new Date().toISOString()
    };

    if (index > -1) {
      subs[index] = { ...subs[index], ...newSub };
    } else {
      subs.push(newSub);
    }

    saveSubscriptions(subs);
    return res.json({ success: true });
  });

  // Unsubscribe from push notifications API
  app.post("/api/push/unsubscribe", (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: "Endpoint is required" });
    }

    const subs = getSubscriptions();
    const filtered = subs.filter((s: any) => s.endpoint !== endpoint);
    saveSubscriptions(filtered);
    return res.json({ success: true });
  });

  // Service Worker route for real-time mobile push and background study notifications
  app.get("/sw.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.send(`
      self.addEventListener('install', (event) => {
        self.skipWaiting();
      });

      self.addEventListener('activate', (event) => {
        event.waitUntil(self.clients.claim());
      });

      // Listen for the push event (sent from server when tab is closed)
      self.addEventListener('push', (event) => {
        let data = {};
        if (event.data) {
          try {
            data = event.data.json();
          } catch (e) {
            data = { title: '📖 حان وقت المذاكرة والتميز! 🚀', body: event.data.text() };
          }
        }
        
        const title = data.title || '📖 حان وقت المذاكرة والتميز! 🚀';
        const options = {
          body: data.body || 'يا بطل، حان وقت مذاكرة جدولك اليومي. همتك عالية والـ 100% بانتظارك! 💪✨',
          icon: data.icon || '/favicon.ico',
          badge: data.badge || '/favicon.ico',
          vibrate: [200, 100, 200],
          data: {
            url: data.url || '/'
          }
        };
        
        event.waitUntil(
          self.registration.showNotification(title, options)
        );
      });

      // Handle notification click to open or focus the app
      self.addEventListener('notificationclick', (event) => {
        event.notification.close();
        const urlToOpen = event.notification.data ? event.notification.data.url : '/';
        
        event.waitUntil(
          self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
              if (client.url.includes(urlToOpen) && 'focus' in client) {
                return client.focus();
              }
            }
            if (self.clients.openWindow) {
              return self.clients.openWindow(urlToOpen);
            }
          })
        );
      });
    `);
  });

  // Server background task checking every 5 seconds to send Web Push notifications perfectly on time
  setInterval(async () => {
    const subs = getSubscriptions();
    if (subs.length === 0) return;

    const now = new Date();
    let hasChanges = false;
    
    for (const sub of subs) {
      try {
        // 1. Get the current time in the user's timezone formatted as "HH:mm" robustly
        let localTimeStr = "";
        try {
          const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: sub.timezone || "Asia/Riyadh",
            hour: "numeric",
            minute: "numeric",
            hour12: false
          }).formatToParts(now);

          let hour = "";
          let minute = "";
          for (const part of parts) {
            if (part.type === "hour") hour = part.value;
            if (part.type === "minute") minute = part.value;
          }

          // Handle Node platform discrepancies (some return '24' for midnight)
          if (hour === "24") hour = "00";
          if (hour.length === 1) hour = "0" + hour;
          if (minute.length === 1) minute = "0" + minute;
          
          localTimeStr = `${hour}:${minute}`;
        } catch (e) {
          // If timezone is invalid, skip
          continue;
        }

        // 2. Gather active reminder times for this subscription (either from email or cached)
        let activeReminderTimes: string[] = sub.reminderTimes || [];

        // If subscription has an email, sync directly with their database file on the server
        if (sub.email) {
          const filePath = getFilePathForEmail(sub.email);
          if (fs.existsSync(filePath)) {
            try {
              const content = fs.readFileSync(filePath, "utf-8");
              const parsed = JSON.parse(content);
              if (parsed && Array.isArray(parsed.schedules)) {
                activeReminderTimes = parsed.schedules
                  .map((s: any) => s.studyReminderTime)
                  .filter((t: any) => typeof t === "string" && t.trim() !== "");
              }
            } catch (err) {
              // Fallback to cached reminderTimes
            }
          }
        }

        // 3. Trigger push notification if localTimeStr is in activeReminderTimes list
        if (activeReminderTimes.includes(localTimeStr)) {
          // Prevent multiple notifications within the same minute
          const minuteKey = `${localTimeStr}_${now.getUTCDay()}_${now.getUTCMonth()}_${now.getUTCDate()}`;
          if (sub.lastNotifiedMinute === minuteKey) {
            continue;
          }

          sub.lastNotifiedMinute = minuteKey;
          hasChanges = true;

          const payload = JSON.stringify({
            title: "📖 حان وقت المذاكرة والتميز! 🚀",
            body: "يا بطل، حان وقت مذاكرة جدولك اليومي في تطبيق جدولني. همتك عالية والـ 100% بانتظارك! 💪✨",
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            url: "/"
          });

          webpush.sendNotification(sub.subscription, payload)
            .catch(err => {
              console.error("Failed to send push to endpoint:", sub.endpoint, err.statusCode);
              if (err.statusCode === 410 || err.statusCode === 404) {
                sub.shouldRemove = true; // Mark expired subscription for removal
                hasChanges = true;
              }
            });
        }
      } catch (err) {
        console.error("Error in sub processing:", err);
      }
    }

    // Clean up expired subscriptions or save state changes (like lastNotifiedMinute)
    const activeSubs = subs.filter(sub => !sub.shouldRemove);
    if (activeSubs.length !== subs.length || hasChanges) {
      saveSubscriptions(activeSubs);
    }
  }, 3000); // Check every 3 seconds to ensure timeliness without delays

  // Vite middleware setup for assets and SPA rendering
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
