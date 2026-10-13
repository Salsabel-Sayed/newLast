import mongoose, { Types } from "mongoose";
import "../src/registerModels.js";
import {
  allocateFifo,
  reserveAllocations,
} from "../src/modules/inventory/batches/batch.service.js";
import { BatchModel } from "../src/modules/inventory/batches/batch.model.js";
import { RawMaterialModel } from "../src/modules/inventory/raw-materials/rawMaterial.model.js";
import { withTransaction } from "../src/shared/database/withTransaction.js";
import { getNextSequenceNumber } from "../src/shared/numberSequence/numberSequence.service.js";

const CONCURRENT_ATTEMPTS = 10;
const REQUEST_PER_ATTEMPT = 20;
const BATCH_TOTAL = 100;

async function main(): Promise<void> {
  await mongoose.connect("mongodb://127.0.0.1:27018/soso-dash?replicaSet=rs0");

  const rawMaterial = await RawMaterialModel.create({
    code: "RM-RACE-" + Date.now(),
    name: "مادة اختبار السباق",
  });

  const batchCode = await getNextSequenceNumber("BAT");
  const batch = await BatchModel.create({
    batchCode,
    rawMaterialId: rawMaterial._id,
    rawMaterialName: rawMaterial.name,
    rawMaterialCode: rawMaterial.code,
    source: "opening_balance",
    originalQty: BATCH_TOTAL,
    remainingQty: BATCH_TOTAL,
    reservedQty: 0,
    unitCostPerKg: 10,
    purchaseDate: new Date(),
    status: "active",
  });

  console.log(`seeded 1 batch with ${BATCH_TOTAL}kg; firing ${CONCURRENT_ATTEMPTS} concurrent attempts to reserve ${REQUEST_PER_ATTEMPT}kg each (${CONCURRENT_ATTEMPTS * REQUEST_PER_ATTEMPT}kg total demand)`);

  const attempts = Array.from({ length: CONCURRENT_ATTEMPTS }, (_, i) =>
    withTransaction(async (session) => {
      const allocations = await allocateFifo(rawMaterial._id, REQUEST_PER_ATTEMPT, session);
      await reserveAllocations(
        allocations,
        {
          movementType: "sales_reservation",
          relatedEntityType: "RaceTestOrder",
          relatedEntityId: new Types.ObjectId(),
        },
        session
      );
      return { attempt: i, ok: true };
    }).catch((err: unknown) => ({
      attempt: i,
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    }))
  );

  const results = await Promise.all(attempts);
  const succeeded = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  console.log("succeeded:", succeeded.length, "failed:", failed.length);
  console.log(
    "failure reasons:",
    Array.from(new Set(failed.map((r) => ("message" in r ? r.message : "")))
  ));

  const finalBatch = await BatchModel.findById(batch._id);
  console.log("final batch reservedQty:", finalBatch?.reservedQty, "remainingQty:", finalBatch?.remainingQty);

  const expectedSucceeded = Math.floor(BATCH_TOTAL / REQUEST_PER_ATTEMPT);

  const noOverselling = (finalBatch?.reservedQty ?? -1) <= BATCH_TOTAL;
  const exactExpectedCount = succeeded.length === expectedSucceeded;
  const reservedMatchesSucceeded = finalBatch?.reservedQty === succeeded.length * REQUEST_PER_ATTEMPT;
  const neverNegative = (finalBatch?.remainingQty ?? -1) >= 0 && (finalBatch?.reservedQty ?? -1) >= 0;

  console.log({ noOverselling, exactExpectedCount, reservedMatchesSucceeded, neverNegative });

  await RawMaterialModel.deleteOne({ _id: rawMaterial._id });
  await BatchModel.deleteOne({ _id: batch._id });
  await mongoose.disconnect();

  if (!noOverselling || !exactExpectedCount || !reservedMatchesSucceeded || !neverNegative) {
    console.error("RACE CONDITION TEST FAILED");
    process.exit(1);
  }
  console.log("RACE CONDITION TEST PASSED — no overselling, no negative balances");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
