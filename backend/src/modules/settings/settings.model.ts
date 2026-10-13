import { Schema, model } from "mongoose";

export interface SettingsAttrs {
  companyName?: string;
  currency: string;
  defaultTaxPercent: number;
  allowPermanentDelete: boolean;
  systemInitialized: boolean;
}

const settingsSchema = new Schema<SettingsAttrs>(
  {
    companyName: { type: String },
    // Not schema-`required`: an empty string is a valid "not yet configured" bootstrap
    // state (Mongoose's required validator rejects "" even when supplied via default).
    currency: { type: String, default: "" },
    defaultTaxPercent: { type: Number, required: true, default: 14, min: 0, max: 100 },
    allowPermanentDelete: { type: Boolean, required: true, default: false },
    systemInitialized: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

export const SettingsModel = model<SettingsAttrs>("Settings", settingsSchema);
