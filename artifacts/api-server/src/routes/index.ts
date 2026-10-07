import { Router, type IRouter } from "express";
import healthRouter from "./health";
import flowmindRouter from "./flowmind";

const router: IRouter = Router();

router.use(healthRouter);
router.use(flowmindRouter);

export default router;
