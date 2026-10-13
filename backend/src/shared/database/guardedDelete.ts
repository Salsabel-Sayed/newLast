import type { Model } from "mongoose";
import { AppError } from "../../middlewares/Errors/appError.js";

interface DependentCheck {
  model: Model<any>;
  field: string;
}

export type DeleteOutcome = "deleted" | "disabled";

// Hard-deletes only if unreferenced; otherwise soft-disables (isActive=false) per core rule #6.
export async function guardedDelete<T extends { isActive: boolean }>(
  model: Model<T>,
  id: string,
  dependents: DependentCheck[]
): Promise<DeleteOutcome> {
  const target = await model.findById(id);
  if (!target) {
    throw new AppError("السجل غير موجود", 404);
  }

  for (const dependent of dependents) {
    const hasDependents = await dependent.model.exists({
      [dependent.field]: id,
    });
    if (hasDependents) {
      target.isActive = false;
      await target.save();
      return "disabled";
    }
  }

  await model.deleteOne({ _id: id });
  return "deleted";
}
