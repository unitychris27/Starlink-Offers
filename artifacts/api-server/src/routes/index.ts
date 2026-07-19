import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sessionsRouter from "./sessions";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sessionsRouter);
router.use(adminRouter);

export default router;
