import type { ClientSession } from "mongoose";
import {
  NumberSequenceModel,
  type NumberSequencePrefix,
} from "./numberSequence.model.js";

function formatSequenceNumber(
  prefix: NumberSequencePrefix,
  year: number,
  lastNumber: number
): string {
  return `${prefix}-${year}-${String(lastNumber).padStart(4, "0")}`;
}

interface GetNextSequenceNumberOptions {
  date?: Date;
  session?: ClientSession;
}

export async function getNextSequenceNumber(
  prefix: NumberSequencePrefix,
  options: GetNextSequenceNumberOptions = {}
): Promise<string> {
  const year = (options.date ?? new Date()).getFullYear();

  const sequence = await NumberSequenceModel.findOneAndUpdate(
    { prefix, year },
    { $inc: { lastNumber: 1 } },
    {
      returnDocument: "after",
      upsert: true,
      session: options.session ?? null,
    }
  );

  if (!sequence) {
    throw new Error("Failed to generate sequence number");
  }

  return formatSequenceNumber(prefix, year, sequence.lastNumber);
}
