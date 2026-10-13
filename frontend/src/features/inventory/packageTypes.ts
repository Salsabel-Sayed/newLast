export const PACKAGE_TYPES = ["sack", "carton", "barrel", "jute_sack", "custom"] as const;
export type PackageType = (typeof PACKAGE_TYPES)[number];

export const PACKAGE_TYPE_LABELS: Record<PackageType, string> = {
  sack: "شكارة",
  carton: "كرتونة",
  barrel: "برميل",
  jute_sack: "جوال خيش",
  custom: "أخرى",
};
