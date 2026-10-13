import mongoose, { Types } from "mongoose";
import "../src/registerModels.js";
import {
  allocateFifo,
  reserveAllocations,
  issueAllocations,
  releaseAllocations,
} from "../src/modules/inventory/batches/batch.service.js";
import { BatchModel } from "../src/modules/inventory/batches/batch.model.js";
import { withTransaction } from "../src/shared/database/withTransaction.js";

const RAW_MATERIAL_ID = process.argv[2];
if (!RAW_MATERIAL_ID) {
  throw new Error("usage: verify-fifo.ts <rawMaterialId>");
}

async function main(): Promise<void> {
  await mongoose.connect("mongodb://127.0.0.1:27018/soso-dash?replicaSet=rs0");

  const rawMaterialId = new Types.ObjectId(RAW_MATERIAL_ID);

  // 1) FIFO allocation for 60kg should take all 50 from the oldest batch, then 10 from the next oldest
  await withTransaction(async (session) => {
    const allocations = await allocateFifo(rawMaterialId, 60, session);
    console.log(
      "allocation plan for 60kg:",
      allocations.map((a) => a.quantityKg)
    );
    if (allocations.length !== 2 || allocations[0]?.quantityKg !== 50 || allocations[1]?.quantityKg !== 10) {
      throw new Error("FIFO allocation order/amounts incorrect");
    }
    console.log("FIFO oldest-first allocation: CORRECT");
  });

  // 2) Reserve 60kg (oldest-first), then confirm reservedQty on batches
  const allocations = await withTransaction(async (session) => {
    const plan = await allocateFifo(rawMaterialId, 60, session);
    await reserveAllocations(
      plan,
      {
        movementType: "sales_reservation",
        relatedEntityType: "TestOrder",
        relatedEntityId: new Types.ObjectId(),
      },
      session
    );
    return plan;
  });

  const batchesAfterReserve = await BatchModel.find({ rawMaterialId }).sort({ purchaseDate: 1 });
  console.log(
    "reservedQty per batch after reserving 60kg:",
    batchesAfterReserve.map((b) => b.reservedQty)
  );
  if (batchesAfterReserve[0]?.reservedQty !== 50 || batchesAfterReserve[1]?.reservedQty !== 10 || batchesAfterReserve[2]?.reservedQty !== 0) {
    throw new Error("Reservation amounts incorrect");
  }
  console.log("Reservation correctness: CORRECT");

  // 3) Requesting more than available (20kg left across batch 2 remainder + batch 3, but need 100) should fail cleanly
  try {
    await withTransaction(async (session) => {
      await allocateFifo(rawMaterialId, 1000, session);
    });
    throw new Error("Expected insufficient stock error was not thrown");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("غير كافية")) throw err;
    console.log("Over-request correctly rejected:", message);
  }

  // 4) Release the reservation, confirm reservedQty back to 0
  await withTransaction(async (session) => {
    await releaseAllocations(
      allocations,
      {
        movementType: "sales_reservation_release",
        relatedEntityType: "TestOrder",
        relatedEntityId: new Types.ObjectId(),
      },
      session
    );
  });
  const batchesAfterRelease = await BatchModel.find({ rawMaterialId }).sort({ purchaseDate: 1 });
  console.log(
    "reservedQty per batch after release:",
    batchesAfterRelease.map((b) => b.reservedQty)
  );
  if (batchesAfterRelease.some((b) => b.reservedQty !== 0)) {
    throw new Error("Release did not fully clear reservations");
  }
  console.log("Release correctness: CORRECT");

  // 5) Reserve again then issue (deliver), confirm remainingQty decreases and oldest batch depletes
  const allocations2 = await withTransaction(async (session) => {
    const plan = await allocateFifo(rawMaterialId, 60, session);
    await reserveAllocations(
      plan,
      { movementType: "sales_reservation", relatedEntityType: "TestOrder", relatedEntityId: new Types.ObjectId() },
      session
    );
    return plan;
  });

  await withTransaction(async (session) => {
    await issueAllocations(
      allocations2,
      { movementType: "sales_issue", relatedEntityType: "TestOrder", relatedEntityId: new Types.ObjectId() },
      session
    );
  });

  const batchesAfterIssue = await BatchModel.find({ rawMaterialId }).sort({ purchaseDate: 1 });
  console.log(
    "remainingQty/status per batch after issue:",
    batchesAfterIssue.map((b) => `${b.remainingQty}/${b.status}`)
  );
  if (batchesAfterIssue[0]?.remainingQty !== 0 || batchesAfterIssue[0]?.status !== "depleted") {
    throw new Error("Oldest batch should be fully depleted after issuing 60kg");
  }
  if (batchesAfterIssue[1]?.remainingQty !== 20 || batchesAfterIssue[2]?.remainingQty !== 20) {
    throw new Error("Remaining batch quantities incorrect after issue");
  }
  console.log("Issue correctness (oldest depleted, FIFO respected): CORRECT");

  await mongoose.disconnect();
  console.log("FIFO VERIFICATION PASSED");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
