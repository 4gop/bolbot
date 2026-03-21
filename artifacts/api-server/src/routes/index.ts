import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import chatRouter from "./chat.js";
import leaderboardRouter from "./leaderboard.js";
import statsRouter from "./stats.js";
import usersRouter from "./users.js";
import whatsappRouter from "./whatsapp.js";
import telegramRouter from "./telegram.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(leaderboardRouter);
router.use(statsRouter);
router.use(usersRouter);
router.use(whatsappRouter);
router.use(telegramRouter);

export default router;
