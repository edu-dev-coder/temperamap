import "dotenv/config";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { createGzip } from "node:zlib";
import * as db from "./lib/db.mjs";
import { hashPassword, verifyPassword } from "./lib/crypto.mjs";

// ── Config ───────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const DIST = join(__dirname, "dist");
const SESSION_SECRET = process.env.SESSION_SECRET || randomUUID();
const MAX_BODY_BYTES = 1_048_576; // 1 MB
const SESSION_ROTATE_MS = 3_600_000; // rotate every 1 hour
const LOGIN_FAIL_LIMIT = 5;
const LOGIN_FAIL_WINDOW_MS = 900_000; // 15 min

// ── MIME types ───────────────────────────────────────────────────────────────

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
};

// ── Sanitization ─────────────────────────────────────────────────────────────

const DANGEROUS_CHARS = /[<>\"'`;\\]/g;

function sanitizeStr(val) {
  if (typeof val !== "string") return val;
  return val.replace(DANGEROUS_CHARS, "");
}

function sanitizeObj(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") out[k] = sanitizeStr(v);
    else if (Array.isArray(v)) out[k] = v.map((i) => typeof i === "string" ? sanitizeStr(i) : i);
    else out[k] = v;
  }
  return out;
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function isValidPassword(pw) {
  return typeof pw === "string" && pw.length >= 6 && pw.length <= 128;
}

function isValidId(id) {
  return typeof id === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(id);
}

// ── Audit log ────────────────────────────────────────────────────────────────

const auditLog = [];
const AUDIT_MAX = 1000;

function audit(ip, method, url, status, userId) {
  const entry = { ts: new Date().toISOString(), ip, method, url, status, userId: userId || null };
  auditLog.push(entry);
  if (auditLog.length > AUDIT_MAX) auditLog.shift();
  if (status >= 400) console.log(`[audit] ${status} ${method} ${url} from ${ip}`);
}

// ── Sessions ─────────────────────────────────────────────────────────────────

const sessions = new Map(); // tokenHash → { userId, createdAt }

function createSession(userId) {
  const token = randomUUID();
  sessions.set(hashToken(token), { userId, createdAt: Date.now() });
  return token;
}

function destroySession(token) {
  sessions.delete(hashToken(token));
}

function getSessionUserId(token) {
  if (!token) return undefined;
  const sess = sessions.get(hashToken(token));
  if (!sess) return undefined;
  return sess.userId;
}

function shouldRotateSession(token) {
  if (!token) return false;
  const sess = sessions.get(hashToken(token));
  if (!sess) return false;
  return Date.now() - sess.createdAt > SESSION_ROTATE_MS;
}

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  for (const pair of header.split(";")) {
    const idx = pair.indexOf("=");
    if (idx > 0) {
      const key = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1).trim();
      try { cookies[key] = decodeURIComponent(val); } catch { cookies[key] = val; }
    }
  }
  return cookies;
}

// ── Brute-force login protection ─────────────────────────────────────────────

const loginAttempts = new Map(); // key (ip or email) → { count, firstAt }

function recordLoginFail(key) {
  const now = Date.now();
  let entry = loginAttempts.get(key);
  if (!entry || now - entry.firstAt > LOGIN_FAIL_WINDOW_MS) {
    entry = { count: 0, firstAt: now };
    loginAttempts.set(key, entry);
  }
  entry.count++;
  return entry.count;
}

function isLoginLocked(key) {
  const entry = loginAttempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > LOGIN_FAIL_WINDOW_MS) {
    loginAttempts.delete(key);
    return false;
  }
  return entry.count >= LOGIN_FAIL_LIMIT;
}

function clearLoginFails(key) {
  loginAttempts.delete(key);
}

// Cleanup stale login buckets every 5 min
setInterval(() => {
  const cutoff = Date.now() - LOGIN_FAIL_WINDOW_MS * 2;
  for (const [key, entry] of loginAttempts) {
    if (entry.firstAt < cutoff) loginAttempts.delete(key);
  }
}, 300_000).unref();

// ── Rate limiter ─────────────────────────────────────────────────────────────

const rateBuckets = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 120;

function rateLimit(ip) {
  const now = Date.now();
  let bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.start > RATE_WINDOW_MS) {
    bucket = { start: now, count: 0 };
    rateBuckets.set(ip, bucket);
  }
  bucket.count++;
  return bucket.count > RATE_MAX;
}

setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS * 2;
  for (const [ip, bucket] of rateBuckets) {
    if (bucket.start < cutoff) rateBuckets.delete(ip);
  }
}, 300_000).unref();

// ── Helpers ──────────────────────────────────────────────────────────────────

function getClientIp(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    || req.socket.remoteAddress
    || "unknown";
}

function parseQuery(raw) {
  const qs = raw.includes("?") ? raw.split("?")[1] : "";
  const params = {};
  if (!qs) return params;
  for (const pair of qs.split("&")) {
    const [k, v] = pair.split("=");
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
  }
  return params;
}

async function readBody(req) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BODY_BYTES) {
      throw new Error("BODY_TOO_LARGE");
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString();
  return raw ? JSON.parse(raw) : {};
}

function json(res, data, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(body);
}

function hashToken(token) {
  return createHash("sha256").update(token + SESSION_SECRET).digest("hex");
}

// ── Security headers ─────────────────────────────────────────────────────────

function setSecurityHeaders(res, origin) {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("X-Download-Options", "noopen");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");

  // HSTS (only effective behind HTTPS/proxy)
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  // CSP
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  res.setHeader("Content-Security-Policy", csp);
}

// ── CORS ─────────────────────────────────────────────────────────────────────

function handleCORS(req, res) {
  const origin = req.headers.origin;
  const host = req.headers.host;

  // Allow same-origin only
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: "CORS: origin not allowed" }));
        return false;
      }
    } catch {
      res.writeHead(403);
      res.end(JSON.stringify({ error: "CORS: invalid origin" }));
      return false;
    }
  }

  // Handle preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": host ? `https://${host}` : "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    });
    res.end();
    return false;
  }

  return true;
}

// ── Compression ──────────────────────────────────────────────────────────────

function compress(res, body, acceptEncoding, extraHeaders = {}) {
  if (!acceptEncoding.includes("gzip") || Buffer.byteLength(body) < 1024) {
    res.writeHead(200, extraHeaders);
    res.end(body);
    return;
  }
  res.writeHead(200, { ...extraHeaders, "Content-Encoding": "gzip", "Vary": "Accept-Encoding" });
  const gzip = createGzip({ level: 6 });
  gzip.pipe(res);
  gzip.end(body);
}

// ── Static file server ───────────────────────────────────────────────────────

async function serveStatic(req, res, acceptEncoding) {
  let filePath = join(DIST, req.url === "/" ? "index.html" : req.url.split("?")[0]);

  // Prevent path traversal
  const resolved = join(DIST, req.url.split("?")[0]);
  if (!resolved.startsWith(DIST)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  filePath = resolved;

  try {
    const s = await stat(filePath);
    if (s.isDirectory()) filePath = join(filePath, "index.html");
  } catch {
    filePath = join(DIST, "index.html");
  }

  try {
    const data = await readFile(filePath);
    const ext = extname(filePath);
    const mime = MIME[ext] || "application/octet-stream";
    const isHashed = /-[A-Za-z0-9_-]{8}\.\w+$/.test(filePath);
    const cacheControl = isHashed
      ? "public, max-age=31536000, immutable"
      : "public, max-age=0, must-revalidate";

    compress(res, data, acceptEncoding, { "Content-Type": mime, "Cache-Control": cacheControl });
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

// ── API router ───────────────────────────────────────────────────────────────

async function handleAPI(req, res, ip) {
  const url = (req.url ?? "").split("?")[0];
  const method = req.method;
  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies.tm_session;
  const sessionUserId = getSessionUserId(sessionToken);

  // ── Health ──────────────────────────────────────────────────────────────
  if (method === "GET" && url === "/api/health") {
    audit(ip, method, url, 200, sessionUserId);
    return json(res, { status: "ok", uptime: process.uptime() });
  }

  // ── Audit log (admin only) ─────────────────────────────────────────────
  if (method === "GET" && url === "/api/admin/audit") {
    if (!sessionUserId) return json(res, { error: "Unauthorized" }, 401);
    const user = await db.findUserById(sessionUserId);
    if (!user || user.role !== "admin") return json(res, { error: "Forbidden" }, 403);
    audit(ip, method, url, 200, sessionUserId);
    return json(res, auditLog.slice(-200));
  }

  // ── Auth ────────────────────────────────────────────────────────────────
  if (method === "GET" && url === "/api/tm/auth/me") {
    if (!sessionUserId) {
      audit(ip, method, url, 200, null);
      return json(res, null);
    }
    const user = await db.findUserById(sessionUserId);
    if (!user) {
      audit(ip, method, url, 200, null);
      return json(res, null);
    }

    // Session rotation check
    if (shouldRotateSession(sessionToken)) {
      destroySession(sessionToken);
      const newToken = randomUUID();
      sessions.set(hashToken(newToken), { userId: user.id, createdAt: Date.now() });
      res.setHeader("Set-Cookie", `tm_session=${newToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    }

    audit(ip, method, url, 200, user.id);
    return json(res, { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, createdAt: user.createdAt, updatedAt: user.createdAt });
  }

  if (method === "POST" && url === "/api/tm/auth/login") {
    const body = await readBody(req);

    // Input validation
    if (!body.email || !body.password) {
      audit(ip, method, url, 400, null);
      return json(res, { error: "Email and password are required" }, 400);
    }
    if (!isValidEmail(body.email)) {
      audit(ip, method, url, 400, null);
      return json(res, { error: "Invalid email format" }, 400);
    }

    // Brute-force check (by IP and email)
    if (isLoginLocked(`ip:${ip}`) || isLoginLocked(`email:${body.email}`)) {
      audit(ip, method, url, 429, null);
      return json(res, { error: "Too many login attempts. Try again later." }, 429);
    }

    const user = await db.findUserByEmail(body.email);
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      const count = Math.max(recordLoginFail(`ip:${ip}`), recordLoginFail(`email:${body.email}`));
      audit(ip, method, url, 401, null);
      return json(res, { error: "Invalid email or password" }, 401);
    }

    clearLoginFails(`ip:${ip}`);
    clearLoginFails(`email:${body.email}`);

    const token = randomUUID();
    sessions.set(hashToken(token), { userId: user.id, createdAt: Date.now() });
    await db.updateUserLastLogin(user.id);
    res.setHeader("Set-Cookie", `tm_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    audit(ip, method, url, 200, user.id);
    return json(res, { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, createdAt: user.createdAt, updatedAt: user.createdAt });
  }

  if (method === "POST" && url === "/api/tm/auth/register") {
    const body = await readBody(req);

    // Input validation
    if (!body.email || !body.password) {
      audit(ip, method, url, 400, null);
      return json(res, { error: "Email and password are required" }, 400);
    }
    if (!isValidEmail(body.email)) {
      audit(ip, method, url, 400, null);
      return json(res, { error: "Invalid email format" }, 400);
    }
    if (!isValidPassword(body.password)) {
      audit(ip, method, url, 400, null);
      return json(res, { error: "Password must be 6-128 characters" }, 400);
    }

    if (await db.findUserByEmail(body.email)) {
      audit(ip, method, url, 409, null);
      return json(res, { error: "Email already registered" }, 409);
    }

    const newUser = {
      id: `u-${randomUUID().slice(0, 8)}`,
      email: body.email,
      passwordHash: await hashPassword(body.password),
      firstName: sanitizeStr(body.firstName) || null,
      lastName: sanitizeStr(body.lastName) || null,
      role: "user",
      createdAt: new Date().toISOString(),
      lastLogin: null,
    };
    await db.createUser(newUser);
    const token = randomUUID();
    sessions.set(hashToken(token), { userId: newUser.id, createdAt: Date.now() });
    res.setHeader("Set-Cookie", `tm_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    audit(ip, method, url, 201, newUser.id);
    return json(res, { id: newUser.id, email: newUser.email, firstName: newUser.firstName, lastName: newUser.lastName, role: newUser.role, createdAt: newUser.createdAt, updatedAt: newUser.createdAt }, 201);
  }

  if (method === "POST" && url === "/api/tm/auth/logout") {
    if (sessionToken) destroySession(sessionToken);
    res.setHeader("Set-Cookie", "tm_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
    audit(ip, method, url, 200, sessionUserId);
    return json(res, { ok: true });
  }

  // ── Change Password ─────────────────────────────────────────────────────
  if (method === "POST" && url === "/api/tm/auth/change-password") {
    if (!sessionUserId) return json(res, { error: "Unauthorized" }, 401);
    const body = await readBody(req);
    if (!body.currentPassword || !body.newPassword) {
      return json(res, { error: "Current and new passwords are required" }, 400);
    }
    if (!isValidPassword(body.newPassword)) {
      return json(res, { error: "New password must be 6-128 characters" }, 400);
    }
    const user = await db.findUserById(sessionUserId);
    if (!user) return json(res, { error: "User not found" }, 404);
    if (user.provider === "google" && !user.passwordHash) {
      return json(res, { error: "Google accounts cannot change password here" }, 400);
    }
    if (!(await verifyPassword(body.currentPassword, user.passwordHash))) {
      audit(ip, method, url, 401, sessionUserId);
      return json(res, { error: "Current password is incorrect" }, 401);
    }
    const newHash = await hashPassword(body.newPassword);
    await db.updateUserPassword(sessionUserId, newHash);
    audit(ip, method, url, 200, sessionUserId);
    return json(res, { ok: true });
  }

  // ── Google OAuth ────────────────────────────────────────────────────────
  if (method === "GET" && url === "/api/auth/google") {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
    const redirectUri = `${appUrl}/api/auth/google/callback`;
    const scope = "openid email profile";
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
    res.writeHead(302, { Location: authUrl });
    return res.end();
  }

  if (method === "GET" && url === "/api/auth/google/callback") {
    const parsedUrl = new URL(url, `https://${req.headers.host}`);
    const code = parsedUrl.searchParams.get("code");
    const errorParam = parsedUrl.searchParams.get("error");

    if (errorParam || !code) {
      console.log(`[google-oauth] denied: error=${errorParam} code=${code}`);
      res.writeHead(302, { Location: "/sign-in?error=google_denied" });
      return res.end();
    }

    try {
      const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
      const redirectUri = `${appUrl}/api/auth/google/callback`;
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const tokens = await tokenRes.json();
      if (!tokens.access_token) {
        res.writeHead(302, { Location: "/sign-in?error=google_token" });
        return res.end();
      }

      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const googleUser = await userRes.json();

      let user = await db.findUserByProvider("google", googleUser.id);
      if (!user) {
        user = await db.findUserByEmail(googleUser.email);
        if (user) {
          // Link existing email account to Google
          await supabase.from("users").update({ provider: "google", provider_id: googleUser.id, avatar_url: googleUser.picture }).eq("id", user.id);
          user.provider = "google";
          user.providerId = googleUser.id;
          user.avatarUrl = googleUser.picture;
        } else {
          user = await db.createGoogleUser({
            email: googleUser.email,
            firstName: googleUser.given_name || null,
            lastName: googleUser.family_name || null,
            providerId: googleUser.id,
            avatarUrl: googleUser.picture,
          });
        }
      }

      await db.updateUserLastLogin(user.id);
      const token = randomUUID();
      sessions.set(hashToken(token), { userId: user.id, createdAt: Date.now() });
      res.writeHead(302, {
        Location: "/dashboard",
        "Set-Cookie": `tm_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
      });
      return res.end();
    } catch (err) {
      console.error("[google-oauth]", err.message);
      res.writeHead(302, { Location: "/sign-in?error=google_failed" });
      return res.end();
    }
  }

  // ── Passcodes ───────────────────────────────────────────────────────────
  if (method === "GET" && url === "/api/passcodes") {
    audit(ip, method, url, 200, sessionUserId);
    return json(res, await db.listPasscodes());
  }

  if (method === "POST" && url === "/api/passcodes") {
    const body = await readBody(req);
    const validTypes = ["single_test", "couples_test", "corporate_team", "group_test", "child_3_5", "child_6_9", "preteen_10_12", "teen_13_17"];
    if (!body.testType || !validTypes.includes(body.testType)) {
      audit(ip, method, url, 400, sessionUserId);
      return json(res, { error: "Invalid test type" }, 400);
    }
    const maxUses = Math.max(1, parseInt(body.maxUses, 10) || 1);
    const code = db.generatePasscode(body.testType);
    const expiresAt = body.expiresAt || null;
    const record = {
      code,
      testType: body.testType,
      status: "active",
      maxUses,
      currentUses: 0,
      expiresAt,
      createdAt: new Date().toISOString(),
      usedAt: null,
      usedBy: null,
    };
    await db.createPasscode(record);
    audit(ip, method, url, 201, sessionUserId);
    return json(res, record, 201);
  }

  if (method === "POST" && url === "/api/passcodes/validate") {
    const body = await readBody(req);
    if (!body.code || !body.testType) {
      audit(ip, method, url, 400, sessionUserId);
      return json(res, { error: "Code and testType are required" }, 400);
    }
    const match = await db.findPasscode(body.code, body.testType);
    audit(ip, method, url, match ? 200 : 404, sessionUserId);
    if (match) return json(res, { valid: true, passcode: match });
    return json(res, { valid: false, message: "Invalid or expired passcode" });
  }

  // ── Tests ───────────────────────────────────────────────────────────────
  if (method === "GET" && url === "/api/tests") {
    const parsed = new URL(req.url || "/api/tests", `http://${req.headers.host || "localhost"}`);
    const userId = parsed.searchParams.get("userId");
    try {
      const tests = userId
        ? await db.listTestSessionsByUserId(userId)
        : [];
      audit(ip, method, url, 200, sessionUserId);
      return json(res, tests);
    } catch (e) {
      audit(ip, method, url, 500, sessionUserId);
      return json(res, { error: "Failed to load sessions" }, 500);
    }
  }

  if (method === "POST" && url === "/api/tests") {
    const body = await readBody(req);
    if (!body.passcode) {
      audit(ip, method, url, 400, sessionUserId);
      return json(res, { error: "Passcode is required" }, 400);
    }
    const match = await db.findPasscodeByCode(body.passcode);
    if (!match) {
      audit(ip, method, url, 404, sessionUserId);
      return json(res, { error: "Invalid or expired passcode" }, 404);
    }
    if (match.currentUses >= match.maxUses) {
      audit(ip, method, url, 410, sessionUserId);
      return json(res, { error: "Passcode has no remaining slots" }, 410);
    }
    const newId = `ts-${randomUUID().slice(0, 8)}`;
    const sessionRecord = {
      id: newId,
      userId: sessionUserId || "anonymous",
      testType: body.testType || "single_test",
      status: "pending",
      paid: true,
      passcodeUsed: body.passcode,
      createdAt: new Date().toISOString(),
    };
    await db.createTestSession(sessionRecord);
    if (match) await db.usePasscode(match.code, sessionUserId || "anonymous");
    audit(ip, method, url, 201, sessionUserId);
    return json(res, { id: newId, testType: sessionRecord.testType }, 201);
  }

  if (method === "GET" && url.startsWith("/api/tests/")) {
    const testId = url.split("/").pop();
    if (!isValidId(testId)) {
      audit(ip, method, url, 400, sessionUserId);
      return json(res, { error: "Invalid test ID" }, 400);
    }
    const session = await db.findTestSessionById(testId);
    if (!session) {
      audit(ip, method, url, 404, sessionUserId);
      return json(res, { error: "Session not found" }, 404);
    }
    audit(ip, method, url, 200, sessionUserId);
    return json(res, session);
  }

  if (method === "PATCH" && url.startsWith("/api/tests/")) {
    const testId = url.split("/").pop();
    if (!isValidId(testId)) {
      audit(ip, method, url, 400, sessionUserId);
      return json(res, { error: "Invalid test ID" }, 400);
    }
    const body = await readBody(req);
    const existing = await db.findTestSessionById(testId);
    if (!existing) {
      audit(ip, method, url, 404, sessionUserId);
      return json(res, { error: "Session not found" }, 404);
    }
    const allowed = {};
    if (body.status !== undefined) allowed.status = body.status;
    if (body.answers !== undefined) allowed.answers = body.answers;
    if (body.results !== undefined) allowed.results = body.results;
    if (body.primaryTemp !== undefined) allowed.primaryTemp = body.primaryTemp;
    if (body.secondaryTemp !== undefined) allowed.secondaryTemp = body.secondaryTemp;
    if (body.blend !== undefined) allowed.blend = body.blend;
    if (body.completedAt !== undefined) allowed.completedAt = body.completedAt;
    await db.updateTestSession(testId, allowed);
    audit(ip, method, url, 200, sessionUserId);
    return json(res, { ok: true });
  }

  // ── Reports ─────────────────────────────────────────────────────────────
  if (method === "POST" && url.startsWith("/api/reports/generate/")) {
    audit(ip, method, url, 200, sessionUserId);
    return json(res, { reportUrl: null });
  }

  // ── Admin: Testimonials ─────────────────────────────────────────────────
  if (method === "GET" && url === "/api/admin/testimonials") {
    audit(ip, method, url, 200, sessionUserId);
    return json(res, await db.listTestimonials());
  }

  if (method === "POST" && url === "/api/admin/testimonials") {
    const body = await readBody(req);
    const s = sanitizeObj(body);
    if (!s.authorName || !s.text) {
      audit(ip, method, url, 400, sessionUserId);
      return json(res, { error: "authorName and text are required" }, 400);
    }
    const record = { id: `t-${randomUUID().slice(0, 8)}`, authorName: s.authorName, company: s.company || "", text: s.text, rating: Math.min(5, Math.max(1, Number(s.rating) || 5)), createdAt: new Date().toISOString() };
    await db.createTestimonial(record);
    audit(ip, method, url, 201, sessionUserId);
    return json(res, record, 201);
  }

  if (method === "PUT" && url.match(/^\/api\/admin\/testimonials\/.+$/)) {
    const id = url.split("/").pop();
    if (!isValidId(id)) return json(res, { error: "Invalid ID" }, 400);
    const body = await readBody(req);
    const s = sanitizeObj(body);
    const existing = await db.findTestimonialById(id);
    if (!existing) { audit(ip, method, url, 404, sessionUserId); return json(res, { error: "Not found" }, 404); }
    await db.updateTestimonial(id, s);
    audit(ip, method, url, 200, sessionUserId);
    return json(res, { ...existing, ...s, id });
  }

  if (method === "DELETE" && url.match(/^\/api\/admin\/testimonials\/.+$/)) {
    const id = url.split("/").pop();
    if (!isValidId(id)) return json(res, { error: "Invalid ID" }, 400);
    const existing = await db.findTestimonialById(id);
    if (!existing) { audit(ip, method, url, 404, sessionUserId); return json(res, { error: "Not found" }, 404); }
    await db.deleteTestimonial(id);
    audit(ip, method, url, 200, sessionUserId);
    return json(res, { deleted: true });
  }

  // ── Admin: FAQs ─────────────────────────────────────────────────────────
  if (method === "GET" && url === "/api/admin/faqs") {
    audit(ip, method, url, 200, sessionUserId);
    return json(res, await db.listFaqs());
  }

  if (method === "POST" && url === "/api/admin/faqs") {
    const body = await readBody(req);
    const s = sanitizeObj(body);
    if (!s.question || !s.answer) {
      audit(ip, method, url, 400, sessionUserId);
      return json(res, { error: "question and answer are required" }, 400);
    }
    const maxOrder = await db.getMaxFaqOrder();
    const record = { id: `f-${randomUUID().slice(0, 8)}`, question: s.question, answer: s.answer, order: maxOrder + 1, createdAt: new Date().toISOString() };
    await db.createFaq(record);
    audit(ip, method, url, 201, sessionUserId);
    return json(res, record, 201);
  }

  if (method === "PUT" && url.match(/^\/api\/admin\/faqs\/.+$/)) {
    const id = url.split("/").pop();
    if (!isValidId(id)) return json(res, { error: "Invalid ID" }, 400);
    const body = await readBody(req);
    const s = sanitizeObj(body);
    const existing = await db.findFaqById(id);
    if (!existing) { audit(ip, method, url, 404, sessionUserId); return json(res, { error: "Not found" }, 404); }
    await db.updateFaq(id, s);
    audit(ip, method, url, 200, sessionUserId);
    return json(res, { ...existing, ...s, id });
  }

  if (method === "DELETE" && url.match(/^\/api\/admin\/faqs\/.+$/)) {
    const id = url.split("/").pop();
    if (!isValidId(id)) return json(res, { error: "Invalid ID" }, 400);
    const existing = await db.findFaqById(id);
    if (!existing) { audit(ip, method, url, 404, sessionUserId); return json(res, { error: "Not found" }, 404); }
    await db.deleteFaq(id);
    audit(ip, method, url, 200, sessionUserId);
    return json(res, { deleted: true });
  }

  if (method === "PATCH" && url === "/api/admin/faqs/reorder") {
    const body = await readBody(req);
    if (!Array.isArray(body.ids)) {
      audit(ip, method, url, 400, sessionUserId);
      return json(res, { error: "ids array is required" }, 400);
    }
    await db.reorderFaqs(body.ids);
    audit(ip, method, url, 200, sessionUserId);
    return json(res, await db.listFaqs());
  }

  // ── Admin: Features ─────────────────────────────────────────────────────
  if (method === "GET" && url === "/api/admin/features") {
    audit(ip, method, url, 200, sessionUserId);
    return json(res, await db.listFeatures());
  }

  if (method === "POST" && url === "/api/admin/features") {
    const body = await readBody(req);
    const s = sanitizeObj(body);
    if (!s.title || !s.description) {
      audit(ip, method, url, 400, sessionUserId);
      return json(res, { error: "title and description are required" }, 400);
    }
    const maxOrder = await db.getMaxFeatureOrder();
    const record = { id: `feat-${randomUUID().slice(0, 8)}`, title: s.title, description: s.description, icon: s.icon || "star", order: maxOrder + 1, createdAt: new Date().toISOString() };
    await db.createFeature(record);
    audit(ip, method, url, 201, sessionUserId);
    return json(res, record, 201);
  }

  if (method === "PUT" && url.match(/^\/api\/admin\/features\/.+$/)) {
    const id = url.split("/").pop();
    if (!isValidId(id)) return json(res, { error: "Invalid ID" }, 400);
    const body = await readBody(req);
    const s = sanitizeObj(body);
    const existing = await db.findFeatureById(id);
    if (!existing) { audit(ip, method, url, 404, sessionUserId); return json(res, { error: "Not found" }, 404); }
    await db.updateFeature(id, s);
    audit(ip, method, url, 200, sessionUserId);
    return json(res, { ...existing, ...s, id });
  }

  if (method === "DELETE" && url.match(/^\/api\/admin\/features\/.+$/)) {
    const id = url.split("/").pop();
    if (!isValidId(id)) return json(res, { error: "Invalid ID" }, 400);
    const existing = await db.findFeatureById(id);
    if (!existing) { audit(ip, method, url, 404, sessionUserId); return json(res, { error: "Not found" }, 404); }
    await db.deleteFeature(id);
    audit(ip, method, url, 200, sessionUserId);
    return json(res, { deleted: true });
  }

  if (method === "PATCH" && url === "/api/admin/features/reorder") {
    const body = await readBody(req);
    if (!Array.isArray(body.ids)) {
      audit(ip, method, url, 400, sessionUserId);
      return json(res, { error: "ids array is required" }, 400);
    }
    await db.reorderFeatures(body.ids);
    audit(ip, method, url, 200, sessionUserId);
    return json(res, await db.listFeatures());
  }

  // ── Admin: Sessions ─────────────────────────────────────────────────────
  if (method === "GET" && url === "/api/admin/sessions/stats") {
    const stats = await db.getTestSessionStats();
    audit(ip, method, url, 200, sessionUserId);
    return json(res, stats);
  }

  if (method === "GET" && url === "/api/admin/sessions") {
    const params = parseQuery(req.url ?? "");
    const result = await db.listTestSessions(params.status);
    audit(ip, method, url, 200, sessionUserId);
    return json(res, result);
  }

  // ── Admin: Users ────────────────────────────────────────────────────────
  if (method === "GET" && url === "/api/admin/users") {
    audit(ip, method, url, 200, sessionUserId);
    return json(res, (await db.listUsers()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  }

  // ── Corporate Teams ────────────────────────────────────────────────────────

  if (method === "GET" && url === "/api/corporate/sessions") {
    audit(ip, method, url, 200, sessionUserId);
    const sessions = await db.listCorporateSessions();
    return json(res, sessions);
  }

  if (method === "GET" && url === "/api/corporate/teams") {
    audit(ip, method, url, 200, sessionUserId);
    const teams = await db.listCorporateTeams(sessionUserId);
    return json(res, teams);
  }

  if (method === "POST" && url === "/api/corporate/teams") {
    const body = await readBody(req);
    if (!body.name || !body.memberSessionIds || !Array.isArray(body.memberSessionIds) || body.memberSessionIds.length < 2) {
      audit(ip, method, url, 400, sessionUserId);
      return json(res, { error: "Name and at least 2 member sessions required" }, 400);
    }
    const newId = `ct-${randomUUID().slice(0, 8)}`;
    const team = {
      id: newId,
      adminId: sessionUserId || "anonymous",
      name: body.name,
      memberSessionIds: body.memberSessionIds,
      report: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.createCorporateTeam(team);
    audit(ip, method, url, 201, sessionUserId);
    return json(res, team, 201);
  }

  if (method === "GET" && url.startsWith("/api/corporate/teams/")) {
    const teamId = url.split("/").pop();
    if (!isValidId(teamId)) {
      audit(ip, method, url, 400, sessionUserId);
      return json(res, { error: "Invalid team ID" }, 400);
    }
    const team = await db.findCorporateTeamById(teamId);
    if (!team) {
      audit(ip, method, url, 404, sessionUserId);
      return json(res, { error: "Team not found" }, 404);
    }
    audit(ip, method, url, 200, sessionUserId);
    return json(res, team);
  }

  if (method === "POST" && url.startsWith("/api/corporate/teams/") && url.endsWith("/report")) {
    const teamId = url.split("/")[4];
    if (!isValidId(teamId)) {
      audit(ip, method, url, 400, sessionUserId);
      return json(res, { error: "Invalid team ID" }, 400);
    }
    const team = await db.findCorporateTeamById(teamId);
    if (!team) {
      audit(ip, method, url, 404, sessionUserId);
      return json(res, { error: "Team not found" }, 404);
    }
    const memberSessions = [];
    for (const sessionId of team.memberSessionIds) {
      const session = await db.findTestSessionById(sessionId);
      if (session) memberSessions.push(session);
    }
    const members = memberSessions.map(s => ({
      memberId: s.id,
      memberName: s.userEmail || "Team Member",
      primaryTemp: s.primaryTemp || "Sanguine",
      secondaryTemp: s.secondaryTemp || null,
      results: s.results || {},
    }));
    const primaryTemps = members.map(m => m.primaryTemp);
    audit(ip, method, url, 200, sessionUserId);
    return json(res, { team, members, primaryTemps });
  }

  audit(ip, method, url, 404, sessionUserId);
  return false;
}

// ── Server ───────────────────────────────────────────────────────────────────

async function main() {
  await db.seedIfNeeded(hashPassword);
  console.log(`[db] database ready`);

  const server = createServer(async (req, res) => {
    try {
      const ip = getClientIp(req);

      // Rate limit
      if (rateLimit(ip)) {
        audit(ip, req.method, req.url, 429, null);
        res.writeHead(429, { "Content-Type": "application/json", "Retry-After": "60" });
        return res.end(JSON.stringify({ error: "Too many requests" }));
      }

      // CORS
      if (!handleCORS(req, res)) return;

      // Security headers on every response
      setSecurityHeaders(res, req.headers.origin);

      if (req.url.startsWith("/api")) {
        const handled = await handleAPI(req, res, ip);
        if (handled === false) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Not found" }));
        }
      } else {
        await serveStatic(req, res, req.headers["accept-encoding"] || "");
      }
    } catch (err) {
      if (err.message === "BODY_TOO_LARGE") {
        audit(getClientIp(req), req.method, req.url, 413, null);
        res.writeHead(413, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Request body too large" }));
      }
      console.error(`[server] ${req.method} ${req.url} —`, err.message);
      audit(getClientIp(req), req.method, req.url, 500, null);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    }
  });

  server.listen(PORT, () => {
    console.log(`TemperaMap running at http://localhost:${PORT}`);
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────
  let shuttingDown = false;

  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[${signal}] shutting down…`);

    server.close(() => {
      console.log("[server] closed");
      process.exit(0);
    });

    setTimeout(() => {
      console.error("[server] forced exit after timeout");
      process.exit(1);
    }, 10_000).unref();
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
