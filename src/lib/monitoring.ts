import type { Brand } from "./brand";
import {
  accountSignalScore,
  finalScore,
  handleScore,
  heuristicScam,
  RISKY_PERMISSIONS,
  severityOf,
} from "./scoring";

export const PLATFORMS = ["Instagram", "X", "Facebook", "Telegram", "YouTube"] as const;
export const THREAT_TYPES = [
  "Potential Impersonation",
  "High-risk Impersonation",
  "Likely Scam",
] as const;
export const STATUSES = [
  "New",
  "Under Review",
  "Confirmed",
  "Takedown Requested",
  "Resolved",
  "False Positive",
] as const;

export type ScanCandidate = {
  candidate_kind: "official" | "lookalike" | "benign" | "scam";
  platform_or_store: string;
  handle_or_title: string;
  display_name: string;
  bio_or_description: string;
  logo_similarity: number;
  followers: number;
  verified: boolean;
  account_age_days: number;
  package_id: string | null;
  publisher: string | null;
  permissions: string[];
  classification:
    | "Legitimate / official"
    | "Legitimate / benign"
    | "Potential impersonation"
    | "High-risk impersonation"
    | "Likely scam";
  risk_score: number;
  severity: "low" | "medium" | "high" | "critical";
  reasons: string[];
  signals: Record<string, unknown>;
};

const suffixes = [
  "support",
  "care",
  "help",
  "official",
  "refund",
  "verify",
  "kyc",
  "helpline",
  "desk",
  "team",
];
const scamBios = [
  "Your account is suspended. Complete KYC urgently at bit.ly/verify and share OTP.",
  "Refund processing desk. Pay a small processing fee now to receive your refund.",
  "Official support agent. WhatsApp +91 98765 43210 for urgent account verification.",
];

function officialHandles(brand: Brand) {
  return Object.entries(brand.handles as Record<string, string>).filter(([, h]) => h?.trim());
}
function references(brand: Brand) {
  return [brand.name, ...brand.keywords, ...officialHandles(brand).map(([, h]) => h)];
}
function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}
function variedBrand(brand: Brand, index: number) {
  const base = slug(brand.name);
  return index % 3 === 0
    ? base.replace(/o/g, "0")
    : index % 3 === 1
      ? base.replace(/a/g, "а")
      : base.replace(/m/g, "rn");
}

function evaluate(
  brand: Brand,
  input: Omit<ScanCandidate, "classification" | "risk_score" | "severity" | "reasons" | "signals">,
): ScanCandidate {
  const official = input.package_id
    ? brand.app_ids.includes(input.package_id) &&
      (!(brand.app_publishers ?? []).length ||
        (!!input.publisher && (brand.app_publishers ?? []).includes(input.publisher)))
    : officialHandles(brand).some(
        ([platform, handle]) =>
          platform === input.platform_or_store &&
          handle.toLowerCase() === input.handle_or_title.toLowerCase(),
      );
  if (official)
    return {
      ...input,
      classification: "Legitimate / official",
      risk_score: 0,
      severity: "low",
      reasons: [
        input.package_id
          ? "Package ID and publisher are registered official assets."
          : `Exact match to approved ${input.platform_or_store} handle.`,
      ],
      signals: { official_match: true },
    };

  const identity = handleScore(`${input.handle_or_title} ${input.display_name}`, references(brand));
  const descriptionBrand = input.package_id
    ? handleScore(input.bio_or_description, [brand.name, ...brand.keywords]).similarity
    : 0;
  const scam = heuristicScam(input.bio_or_description);
  const account = accountSignalScore({
    ageDays: input.account_age_days,
    followers: input.followers,
    verified: input.verified,
  });
  const risky = input.permissions.filter((p) => RISKY_PERMISSIONS.includes(p));
  const publisherRisk = input.package_id
    ? Math.min(
        100,
        45 +
          risky.length * 18 +
          ((brand.app_publishers ?? []).includes(input.publisher ?? "") ? -45 : 0),
      )
    : account;
  const score = finalScore({
    handle: identity.score,
    logo: input.logo_similarity,
    ai: Math.round(scam.scam_probability * 100),
    account: publisherRisk,
  });
  const classification =
    score >= 80
      ? "Likely scam"
      : score >= 60
        ? "High-risk impersonation"
        : score >= 40
          ? "Potential impersonation"
          : "Legitimate / benign";
  const reasons = [
    `Identity similarity: ${identity.similarity}% after normalization.`,
    ...(input.package_id && descriptionBrand > 0
      ? [`Description/branding resemblance: ${descriptionBrand}%.`]
      : []),
    `Logo similarity: ${input.logo_similarity}% (simulated).`,
    ...(identity.flags.length ? [`Look-alike markers: ${identity.flags.join(", ")}.`] : []),
    ...(identity.homoglyphs.length ? ["Name contains a visual character substitution."] : []),
    ...(scam.indicators.length ? [`Scam patterns: ${scam.indicators.join(", ")}.`] : []),
    ...(risky.length ? [`Risky permissions: ${risky.join(", ")}.`] : []),
    !input.verified && !input.package_id ? ["Account is unverified."] : [],
  ];
  return {
    ...input,
    classification,
    risk_score: score,
    severity: severityOf(score),
    reasons,
    signals: {
      identity_similarity: identity.similarity,
      identity_score: identity.score,
      description_brand_similarity: descriptionBrand,
      logo_similarity: input.logo_similarity,
      scam_content: Math.round(scam.scam_probability * 100),
      account_or_publisher_risk: publisherRisk,
      scam_indicators: scam.indicators,
      risky_permissions: risky,
    },
  };
}

/** Creates fresh, deterministic simulated candidates from the active brand. No external sites are queried. */
export function generateCandidates(brand: Brand): ScanCandidate[] {
  const official = officialHandles(brand).map(([platform, handle]) =>
    evaluate(brand, {
      candidate_kind: "official",
      platform_or_store: platform,
      handle_or_title: handle,
      display_name: brand.name,
      bio_or_description: "Approved official account.",
      logo_similarity: 100,
      followers: 10000,
      verified: true,
      account_age_days: 900,
      package_id: null,
      publisher: null,
      permissions: [],
    }),
  );
  const officialApps = brand.app_ids.map((packageId) =>
    evaluate(brand, {
      candidate_kind: "official",
      platform_or_store: "Play Store",
      handle_or_title: brand.name,
      display_name: brand.name,
      bio_or_description: "Approved official application.",
      logo_similarity: 100,
      followers: 0,
      verified: true,
      account_age_days: 900,
      package_id: packageId,
      publisher: brand.app_publishers?.[0] ?? "Registered publisher",
      permissions: [],
    }),
  );
  const social = PLATFORMS.map((platform, i) => {
    const name = variedBrand(brand, i);
    const suffix = suffixes[i % suffixes.length];
    return evaluate(brand, {
      candidate_kind: i === 4 ? "benign" : i % 2 ? "scam" : "lookalike",
      platform_or_store: platform,
      handle_or_title: `${name}_${suffix}`,
      display_name: `${brand.name} ${suffix}`,
      bio_or_description:
        i === 4 ? `Unofficial community discussing ${brand.name}.` : scamBios[i % scamBios.length],
      logo_similarity: 72 + ((i * 7) % 24),
      followers: 120 + i * 680,
      verified: false,
      account_age_days: 2 + i * 11,
      package_id: null,
      publisher: null,
      permissions: [],
    });
  });
  const appName = `${brand.name} ${suffixes[6]} update`;
  const apps = [
    evaluate(brand, {
      candidate_kind: "scam",
      platform_or_store: "Play Store",
      handle_or_title: appName,
      display_name: appName,
      bio_or_description: `${brand.name} KYC update. Verify urgently and pay processing fee.`,
      logo_similarity: 88,
      followers: 0,
      verified: false,
      account_age_days: 8,
      package_id: `com.${variedBrand(brand, 2)}.verify`,
      publisher: "Mobile Assist Studio",
      permissions: ["READ_SMS", "BIND_ACCESSIBILITY_SERVICE", "SYSTEM_ALERT_WINDOW"],
    }),
  ];
  return [...official, ...officialApps, ...social, ...apps];
}

export function candidateToThreat(candidate: ScanCandidate, brand: Brand, userId: string) {
  return {
    user_id: userId,
    brand_id: brand.id,
    platform: candidate.platform_or_store,
    type: candidate.classification === "Likely scam" ? "Scam Account" : "Impersonation",
    handle: candidate.handle_or_title,
    display_name: candidate.display_name,
    avatar_url: candidate.logo_similarity > 70 ? brand.logo_url : null,
    bio: candidate.bio_or_description,
    followers: candidate.followers,
    verified: candidate.verified,
    account_created_at: new Date(Date.now() - candidate.account_age_days * 86400000).toISOString(),
    risk_score: candidate.risk_score,
    severity: candidate.severity,
    signals: {
      ...candidate.signals,
      reasons: candidate.reasons,
      classification: candidate.classification,
      source_type: "simulated",
    },
    ai_analysis: {
      explanation: candidate.reasons.join(" "),
      indicators: (candidate.signals.scam_indicators as string[]) ?? [],
      source_type: "simulated",
    },
    status: "New",
  };
}

export function candidateToApp(candidate: ScanCandidate, brand: Brand, userId: string) {
  return {
    user_id: userId,
    brand_id: brand.id,
    store: candidate.platform_or_store,
    title: candidate.display_name,
    package_id: candidate.package_id!,
    developer: candidate.publisher ?? "Unknown",
    installs: "Simulated",
    rating: null,
    permissions: candidate.permissions,
    description: candidate.bio_or_description,
    risk_score: candidate.risk_score,
    severity: candidate.severity,
    signals: {
      ...candidate.signals,
      reasons: candidate.reasons,
      classification: candidate.classification,
      source_type: "simulated",
    },
    ai_analysis: {
      explanation: candidate.reasons.join(" "),
      indicators: (candidate.signals.scam_indicators as string[]) ?? [],
      source_type: "simulated",
    },
    status: "New",
  };
}
