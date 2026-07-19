import { Router } from "express";
import { requireMaintenanceOidc } from "../middleware/maintenance-auth.js";
import { runMaintenance } from "../services/maintenance-service.js";
import { ApiError } from "../utils/api-error.js";

export const maintenanceRouter = Router();

maintenanceRouter.post(
  "/internal/maintenance/run",
  requireMaintenanceOidc,
  async (_request, response, next) => {
    try {
      const summary = await runMaintenance();
      console.info(JSON.stringify({ event: "maintenance.completed", ...summary }));
      response.status(200).json(summary);
    } catch {
      next(new ApiError(500, "maintenance_failed", "Maintenance 작업을 완료하지 못했습니다."));
    }
  },
);
