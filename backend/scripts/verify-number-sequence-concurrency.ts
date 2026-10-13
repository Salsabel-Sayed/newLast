import mongoose from "mongoose";
import "../src/registerModels.js";
import { NumberSequenceModel } from "../src/shared/numberSequence/numberSequence.model.js";

const PREFIX = "PO";

async function main(): Promise<void> {
  await mongoose.connect(
    "mongodb://127.0.0.1:27017/soso-dash-concurrency-test-fresh"
  );
  await mongoose.syncIndexes();
  await NumberSequenceModel.deleteMany({ prefix: PREFIX });

  const year = new Date().getFullYear();

  const results = await Promise.all(
    Array.from({ length: 50 }, () =>
      NumberSequenceModel.findOneAndUpdate(
        { prefix: PREFIX, year },
        { $inc: { lastNumber: 1 } },
        { returnDocument: "after", upsert: true }
      )
    )
  );

  const numbers = results.map((doc) => doc?.lastNumber ?? -1);
  const uniqueCount = new Set(numbers).size;
  const sorted = [...numbers].sort((a, b) => a - b);
  const expected = Array.from({ length: 50 }, (_, i) => i + 1);
  const sequentialOk = JSON.stringify(sorted) === JSON.stringify(expected);

  console.log("total calls:", numbers.length);
  console.log("unique values:", uniqueCount);
  console.log("forms exact 1..50 with no gaps/dupes:", sequentialOk);
  console.log("raw numbers:", numbers);

  const final = await NumberSequenceModel.findOne({ prefix: PREFIX, year });
  console.log("final lastNumber in DB:", final?.lastNumber);

  await NumberSequenceModel.deleteMany({ prefix: PREFIX });
  await mongoose.disconnect();

  if (!sequentialOk || uniqueCount !== 50) {
    console.error("CONCURRENCY TEST FAILED");
    process.exit(1);
  }
  console.log("CONCURRENCY TEST PASSED");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
