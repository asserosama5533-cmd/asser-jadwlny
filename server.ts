import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import webpush from "web-push";

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));

  const PORT = 3000;
  const DATA_DIR = path.join(process.cwd(), "data");

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

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
