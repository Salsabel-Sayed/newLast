export const PACKAGE_TYPES = ["sack", "carton", "barrel", "jute_sack", "custom"] as const;
export type PackageType = (typeof PACKAGE_TYPES)[number];
