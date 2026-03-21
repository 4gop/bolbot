import { Router, type IRouter } from "express";
import { getLeaderboard } from "../services/userService.js";

const router: IRouter = Router();

router.get("/leaderboard", async (req, res) => {
  try {
    const data = await getLeaderboard(10);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Leaderboard error");
    res.status(500).json({ error: "server_error", message: "Failed to fetch leaderboard" });
  }
});

export default router;
