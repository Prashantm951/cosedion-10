import { accountSignalScore, finalScore, handleScore, heuristicScam, severityOf, RISKY_PERMISSIONS } from "./scoring";

export const PLATFORMS = ["Instagram", "X", "Facebook", "Telegram", "YouTube"] as const;
export type Platform = (typeof PLATFORMS)[number];
export const THREAT_TYPES = ["Fake Profile", "Impersonation", "Scam Account", "Suspicious App"] as const;
export const STATUSES = ["New", "Under Review", "Confirmed", "Takedown Requested", "Resolved", "False Positive"] as const;

export const NOVAPAY_BRAND = {
  name: "NovaPay",
  keywords: ["NovaPay", "Nova Pay", "NovaPay UPI", "NovaPay Wallet"],
  handles: { Instagram: "novapay", X: "NovaPayIN", Facebook: "NovaPayOfficial", Telegram: "novapay_news", YouTube: "NovaPayIndia" },
  app_ids: ["in.novapay.wallet"],
  domains: ["novapay.in", "novapay.com"],
  phones: ["1800-419-6682"],
};

export const OFFICIAL_PROFILE = {
  display_name: "NovaPay",
  bio: "India's fastest UPI wallet 💙 Pay, send & save. We'll never ask for your OTP or PIN. Support only via the app.",
  followers: 1_240_000,
  verified: true,
  created: "2017-03-14",
};

type Raw = { platform: Platform; type: string; handle: string; name: string; bio: string; followers: number; ageDays: number; logo: number; daysAgo: number; status?: string };

const RAW: Raw[] = [
  { platform: "Instagram", type: "Impersonation", handle: "novapay_support", name: "NovaPay Support", bio: "Official NovaPay help 🛡️ Failed transaction? DM for refund. WhatsApp +91 98765 43210 for urgent KYC update.", followers: 2140, ageDays: 12, logo: 94, daysAgo: 0 },
  { platform: "Instagram", type: "Scam Account", handle: "n0vapay.care", name: "NovaPay Care", bio: "Customer care 24x7. Your account will be blocked within 24 hours — complete KYC now: bit.ly/novapay-kyc", followers: 860, ageDays: 6, logo: 91, daysAgo: 1 },
  { platform: "Facebook", type: "Scam Account", handle: "NovaPay Refund Desk", name: "NovaPay Refund Desk", bio: "Refund desk for failed UPI payments. Pay processing fee ₹10 via UPI to receive refund. WhatsApp +91 90000 11223", followers: 4310, ageDays: 22, logo: 88, daysAgo: 1 },
  { platform: "Telegram", type: "Scam Account", handle: "novapay_helpdesk", name: "NovaPay Helpdesk 🇮🇳", bio: "Get cashback & refunds instantly. Share OTP with agent for verification. t.me/novapay_agent", followers: 12400, ageDays: 40, logo: 82, daysAgo: 2 },
  { platform: "X", type: "Impersonation", handle: "NovaPay_Official", name: "NovaPay", bio: "Official account of NovaPay. For refunds DM us immediately with your UPI ID.", followers: 3020, ageDays: 18, logo: 96, daysAgo: 0 },
  { platform: "YouTube", type: "Scam Account", handle: "NovaPayIndiaOfficial", name: "NovaPay India Official", bio: "Double your wallet balance offer 🔥 Limited time! Payment link in description.", followers: 9800, ageDays: 55, logo: 79, daysAgo: 3 },
  { platform: "Instagram", type: "Fake Profile", handle: "novapay.team", name: "NovaPay Team", bio: "Giveaway! Win ₹50,000. Follow and DM your UPI ID.", followers: 540, ageDays: 9, logo: 72, daysAgo: 2 },
  { platform: "X", type: "Scam Account", handle: "novapaycare_in", name: "NovaPay Care India", bio: "Helpline for NovaPay users. Call +91 88990 77665 for refund or KYC update. Urgent.", followers: 1200, ageDays: 15, logo: 84, daysAgo: 4 },
  { platform: "Facebook", type: "Impersonation", handle: "NovaPay India Verify", name: "NovaPay India", bio: "Verify your NovaPay account to avoid suspension. Click payment link to verify.", followers: 6700, ageDays: 33, logo: 90, daysAgo: 5 },
  { platform: "Telegram", type: "Fake Profile", handle: "nova_pay_offers", name: "NovaPay Offers", bio: "Exclusive cashback codes daily. Join channel.", followers: 22100, ageDays: 120, logo: 61, daysAgo: 6 },
  { platform: "Instagram", type: "Impersonation", handle: "novapаy_help", name: "NovaPay Help", bio: "Help center ✅ DM for refund. WhatsApp +91 99887 66554", followers: 1430, ageDays: 8, logo: 93, daysAgo: 0 },
  { platform: "YouTube", type: "Fake Profile", handle: "NovaPayTutorials", name: "NovaPay Tutorials", bio: "Tips & tricks for NovaPay app. Unofficial.", followers: 3400, ageDays: 400, logo: 40, daysAgo: 8, status: "False Positive" },
  { platform: "X", type: "Fake Profile", handle: "novapay_deals", name: "NovaPay Deals", bio: "Best deals with NovaPay cashback.", followers: 780, ageDays: 70, logo: 52, daysAgo: 9 },
  { platform: "Facebook", type: "Scam Account", handle: "NovaPay Customer Service", name: "NovaPay Customer Service", bio: "Call our customer service +91 70000 12345. Refund in 5 minutes. Share OTP for processing.", followers: 2900, ageDays: 14, logo: 89, daysAgo: 3, status: "Confirmed" },
  { platform: "Telegram", type: "Impersonation", handle: "novapay_official_in", name: "NovaPay Official", bio: "Official NovaPay announcements. KYC update mandatory — urgent.", followers: 8800, ageDays: 28, logo: 87, daysAgo: 7, status: "Takedown Requested" },
  { platform: "Instagram", type: "Scam Account", handle: "novapay_refunds", name: "NovaPay Refunds", bio: "Refunds processed within 24 hours. Pay now ₹1 to verify UPI.", followers: 410, ageDays: 4, logo: 85, daysAgo: 1 },
  { platform: "X", type: "Impersonation", handle: "NovaPayIN_", name: "NovaPay", bio: "India's fastest UPI wallet 💙 DM for support and refund.", followers: 990, ageDays: 11, logo: 97, daysAgo: 2 },
  { platform: "YouTube", type: "Impersonation", handle: "NovaPay Support Live", name: "NovaPay Support Live", bio: "Live support stream 24/7 — WhatsApp +91 91234 56780 for account unblock.", followers: 1500, ageDays: 20, logo: 86, daysAgo: 10, status: "Resolved" },
  { platform: "Facebook", type: "Fake Profile", handle: "NovaPay Fans", name: "NovaPay Fans Club", bio: "Fan page for NovaPay lovers.", followers: 12000, ageDays: 900, logo: 35, daysAgo: 12, status: "False Positive" },
  { platform: "Telegram", type: "Scam Account", handle: "novapay_kyc_update", name: "NovaPay KYC", bio: "Your wallet is suspended. Complete KYC immediately via tinyurl.com/np-kyc and share OTP.", followers: 5300, ageDays: 3, logo: 88, daysAgo: 0 },
  { platform: "Instagram", type: "Fake Profile", handle: "novapay.cashback", name: "NovaPay Cashback", bio: "Daily cashback tricks.", followers: 2300, ageDays: 150, logo: 58, daysAgo: 11 },
  { platform: "X", type: "Scam Account", handle: "N0vaPaySupport", name: "NovaPay Support", bio: "Facing issue? DM for refund. Our agent will call you. Keep OTP ready.", followers: 640, ageDays: 7, logo: 92, daysAgo: 4, status: "Under Review" },
  { platform: "Facebook", type: "Impersonation", handle: "NovaPay Official Page", name: "NovaPay", bio: "Official page. Update KYC within 24 hours to avoid block.", followers: 15400, ageDays: 60, logo: 95, daysAgo: 13, status: "Takedown Requested" },
  { platform: "YouTube", type: "Scam Account", handle: "NovaPayRewards", name: "NovaPay Rewards", bio: "Claim ₹5000 reward — pay processing fee via UPI link.", followers: 720, ageDays: 16, logo: 76, daysAgo: 14 },
  { platform: "Telegram", type: "Fake Profile", handle: "novapay_community", name: "NovaPay Community", bio: "User discussions about NovaPay.", followers: 3100, ageDays: 300, logo: 45, daysAgo: 15 },
  { platform: "Instagram", type: "Impersonation", handle: "novapay_india_official", name: "NovaPay India", bio: "Official 🇮🇳 For refund WhatsApp +91 93456 78123", followers: 5100, ageDays: 25, logo: 90, daysAgo: 16, status: "Confirmed" },
  { platform: "X", type: "Fake Profile", handle: "novapay_news", name: "NovaPay News", bio: "Unofficial news about fintech & NovaPay.", followers: 1900, ageDays: 500, logo: 30, daysAgo: 18 },
  { platform: "Facebook", type: "Scam Account", handle: "NovaPay Loan Help", name: "NovaPay Instant Loan", bio: "Instant loan ₹50,000 with NovaPay. Pay ₹499 processing fee. Urgent approval.", followers: 3800, ageDays: 19, logo: 80, daysAgo: 20 },
  { platform: "Telegram", type: "Impersonation", handle: "novapay_team_support", name: "NovaPay Team", bio: "Support team — share screen via AnyDesk for refund. WhatsApp +91 80000 99887", followers: 990, ageDays: 10, logo: 89, daysAgo: 22 },
  { platform: "YouTube", type: "Fake Profile", handle: "NovaPayHindi", name: "NovaPay Hindi", bio: "NovaPay guides in Hindi.", followers: 6200, ageDays: 260, logo: 48, daysAgo: 25 },
];

/** Pool of new threats that a live "Run Scan" can discover. */
const SCAN_POOL: Raw[] = [
  { platform: "Instagram", type: "Scam Account", handle: "novapay_rnoney_back", name: "NovaPay Money Back", bio: "Money back guarantee! DM for refund. WhatsApp +91 97777 12121 — urgent.", followers: 220, ageDays: 2, logo: 92, daysAgo: 0 },
  { platform: "X", type: "Impersonation", handle: "NovaPay_Care_Desk", name: "NovaPay Care", bio: "Official care desk. Account suspended? Verify KYC immediately at bit.ly/np-verify", followers: 310, ageDays: 1, logo: 95, daysAgo: 0 },
  { platform: "Telegram", type: "Scam Account", handle: "novapay_cashback_bot", name: "NovaPay Cashback Bot", bio: "Send ₹1 via UPI to unlock ₹500 cashback. OTP needed.", followers: 4100, ageDays: 5, logo: 70, daysAgo: 0 },
  { platform: "Facebook", type: "Impersonation", handle: "NovaPay Help Centre", name: "NovaPay Help Centre", bio: "Help centre for NovaPay. Call +91 88800 44556 for refund.", followers: 1800, ageDays: 9, logo: 91, daysAgo: 0 },
  { platform: "YouTube", type: "Scam Account", handle: "NovaPay Official Giveaway", name: "NovaPay Giveaway", bio: "iPhone giveaway — payment link in description, processing fee ₹99.", followers: 650, ageDays: 3, logo: 83, daysAgo: 0 },
  { platform: "Instagram", type: "Impersonation", handle: "nоvapay.verify", name: "NovaPay Verify", bio: "Verify your wallet within 24 hours or it will be blocked.", followers: 140, ageDays: 1, logo: 94, daysAgo: 0 },
];

function build(r: Raw, brandId: string, userId: string, logoUrl: string | null) {
  const official = Object.values(NOVAPAY_BRAND.handles);
  const h = handleScore(r.handle, [...official, ...NOVAPAY_BRAND.keywords]);
  const ai = heuristicScam(r.bio);
  const verified = false;
  const account = accountSignalScore({ ageDays: r.ageDays, followers: r.followers, verified });
  const aiScore = Math.round(ai.scam_probability * 100);
  const score = finalScore({ handle: h.score, logo: r.logo, ai: aiScore, account });
  const detected = new Date(Date.now() - r.daysAgo * 86400000 - Math.random() * 36e6);
  return {
    user_id: userId,
    brand_id: brandId,
    platform: r.platform,
    type: r.type,
    handle: r.handle,
    display_name: r.name,
    avatar_url: r.logo > 70 ? logoUrl : null,
    bio: r.bio,
    followers: r.followers,
    verified,
    account_created_at: new Date(Date.now() - r.ageDays * 86400000).toISOString(),
    risk_score: score,
    severity: severityOf(score),
    signals: { handle: h.score, handle_similarity: h.similarity, keyword_flags: h.flags, homoglyphs: h.homoglyphs, logo: r.logo, ai: aiScore, account, age_days: r.ageDays },
    ai_analysis: ai,
    status: r.status ?? "New",
    detected_at: detected.toISOString(),
  };
}

export function demoThreats(brandId: string, userId: string, logoUrl: string | null) {
  return RAW.map((r) => build(r, brandId, userId, logoUrl));
}

export function scanDiscoveries(brandId: string, userId: string, logoUrl: string | null, existingHandles: Set<string>, n = 3) {
  const fresh = SCAN_POOL.filter((r) => !existingHandles.has(r.handle));
  const pool = fresh.length ? fresh : SCAN_POOL.map((r) => ({ ...r, handle: r.handle + "_" + Math.floor(Math.random() * 99) }));
  return pool.sort(() => Math.random() - 0.5).slice(0, n).map((r) => build(r, brandId, userId, logoUrl));
}

const APPS = [
  { title: "NovaPay KYC Update", package_id: "com.novapay.kyc.update", developer: "Digital KYC Services", installs: "10K+", rating: 3.1, permissions: ["READ_SMS", "RECEIVE_SMS", "INTERNET", "READ_CONTACTS"], logo: 92, description: "Update your NovaPay KYC instantly to avoid wallet block." },
  { title: "NovaPay Refund Helper", package_id: "in.novapay.refund", developer: "QuickHelp Apps", installs: "5K+", rating: 2.8, permissions: ["BIND_ACCESSIBILITY_SERVICE", "SYSTEM_ALERT_WINDOW", "READ_SMS", "INTERNET"], logo: 88, description: "Get refund for failed NovaPay transactions in minutes." },
  { title: "Nova Pay Wallet Lite", package_id: "com.n0vapay.lite", developer: "AppMakers Studio", installs: "50K+", rating: 3.9, permissions: ["READ_SMS", "READ_CALL_LOG", "CAMERA", "INTERNET"], logo: 85, description: "Lightweight NovaPay wallet for low-end phones." },
  { title: "NovaPay Cashback Rewards", package_id: "com.rewards.novapay", developer: "Rewardz Hub", installs: "1K+", rating: 4.2, permissions: ["SYSTEM_ALERT_WINDOW", "INTERNET", "REQUEST_INSTALL_PACKAGES"], logo: 74, description: "Earn cashback on every NovaPay transaction." },
  { title: "NovaPay Support 24x7", package_id: "com.support.novapay24", developer: "Helpline Tech", installs: "10K+", rating: 2.5, permissions: ["BIND_ACCESSIBILITY_SERVICE", "READ_SMS", "SEND_SMS", "READ_CONTACTS"], logo: 90, description: "Chat with NovaPay support agents 24x7. Screen share supported." },
  { title: "UPI Nova Scanner", package_id: "com.upinova.scan", developer: "ScanSoft", installs: "100K+", rating: 4.0, permissions: ["CAMERA", "INTERNET"], logo: 45, description: "Scan any UPI QR code quickly." },
];

export function demoApps(brandId: string, userId: string, iconUrl: string | null) {
  return APPS.map((a, i) => {
    const risky = a.permissions.filter((p) => RISKY_PERMISSIONS.includes(p));
    const name = handleScore(a.title, NOVAPAY_BRAND.keywords).score;
    const devMismatch = true;
    const perm = Math.min(100, risky.length * 30);
    const score = Math.round(name * 0.25 + a.logo * 0.25 + perm * 0.3 + (devMismatch ? 20 : 0));
    const reasons = [
      `Developer "${a.developer}" is not NovaPay Technologies Pvt. Ltd.`,
      risky.length ? `Requests high-risk permissions: ${risky.join(", ")}` : null,
      a.logo > 70 ? `Icon is ${a.logo}% similar to the official NovaPay icon` : null,
      /kyc|refund|support/i.test(a.title) ? "Title uses a common scam pretext (KYC / refund / support)" : null,
    ].filter(Boolean) as string[];
    return {
      user_id: userId,
      brand_id: brandId,
      store: "Play Store",
      title: a.title,
      package_id: a.package_id,
      developer: a.developer,
      installs: a.installs,
      rating: a.rating,
      permissions: a.permissions,
      description: a.description,
      risk_score: Math.min(99, score),
      severity: severityOf(Math.min(99, score)),
      signals: { name_similarity: name, icon_similarity: a.logo, risky_permissions: risky, developer_mismatch: devMismatch, logo_flag: a.logo > 70 },
      ai_analysis: { scam_probability: Math.min(0.97, score / 100), indicators: reasons.map((r) => r.split(" ")[0]), explanation: reasons.join(". ") + "." },
      status: i === 0 ? "Takedown Requested" : "New",
      detected_at: new Date(Date.now() - i * 2 * 86400000).toISOString(),
    };
  });
}
