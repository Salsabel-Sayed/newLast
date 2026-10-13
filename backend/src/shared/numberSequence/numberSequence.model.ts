import { Schema, model } from "mongoose";

export const NUMBER_SEQUENCE_PREFIXES = [
  "SO",
  "PO",
  "BAT",
  "SI",
  "PI",
  "RET",
  "PAY",
  "EXP",
  "OB",
  "SC",
] as const;

export type NumberSequencePrefix = (typeof NUMBER_SEQUENCE_PREFIXES)[number];

interface NumberSequenceAttrs {
  prefix: NumberSequencePrefix;
  year: number;
  lastNumber: number;
}

const numberSequenceSchema = new Schema<NumberSequenceAttrs>(
  {
    prefix: {
      type: String,
      required: true,
      enum: NUMBER_SEQUENCE_PREFIXES,
    },
    year: {
      type: Number,
      required: true,
    },
    lastNumber: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

numberSequenceSchema.index({ prefix: 1, year: 1 }, { unique: true });

export const NumberSequenceModel = model<NumberSequenceAttrs>(
  "NumberSequence",
  numberSequenceSchema
);
