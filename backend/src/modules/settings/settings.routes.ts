import { Router } from "express";
import { validateRequest } from "../../shared/validation/validateRequest.js";
import * as settingsController from "./settings.controller.js";
import {
  confirmDestructiveActionSchema,
  updateSettingsSchema,
} from "./settings.validation.js";

const router = Router();

router.get("/", settingsController.getSettings);

router.put(
  "/",
  validateRequest({ body: updateSettingsSchema }),
  settingsController.updateSettings
);

router.post(
  "/reset-database",
  validateRequest({ body: confirmDestructiveActionSchema }),
  settingsController.resetDatabase
);

router.post(
  "/reset-transactions",
  validateRequest({ body: confirmDestructiveActionSchema }),
  settingsController.resetTransactions
);

router.post(
  "/reset-number-sequences",
  validateRequest({ body: confirmDestructiveActionSchema }),
  settingsController.resetNumberSequences
);

export const settingsRouter = router;
