import { Router, type IRouter } from "express";
import { getAdminStats } from "../services/userService.js";

const router: IRouter = Router();

router.get("/stats", async (req, res) => {
  const adminToken = process.env.ADMIN_DASHBOARD_TOKEN;
  const providedToken = req.query["token"] as string;

  if (!adminToken || providedToken !== adminToken) {
    res.status(401).json({ error: "unauthorized", message: "Invalid admin token" });
    return;
  }

  try {
    const stats = await getAdminStats();
    res.json(stats);
  } catch (err) {
    req.log.error({ err }, "Stats error");
    res.status(500).json({ error: "server_error", message: "Failed to fetch stats" });
  }
});

export default router;
