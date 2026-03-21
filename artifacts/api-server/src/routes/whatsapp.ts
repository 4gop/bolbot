import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/webhook/whatsapp", (_req, res) => {
  res.status(200).json({ ok: true });
});

export default router;
