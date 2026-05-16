import { Router, type IRouter } from "express";
import healthRouter from "./health";
import overviewRouter from "./overview";
import demoRouter from "./demo";
import uploadsRouter from "./uploads";
import transactionsRouter from "./transactions";
import invoicesRouter from "./invoices";
import ledgerRouter from "./ledger";
import reconciliationRouter from "./reconciliation";
import risksRouter from "./risks";
import payrollRouter from "./payroll";
import gatewayRouter from "./gateway";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(overviewRouter);
router.use(demoRouter);
router.use(uploadsRouter);
router.use(transactionsRouter);
router.use(invoicesRouter);
router.use(ledgerRouter);
router.use(reconciliationRouter);
router.use(risksRouter);
router.use(payrollRouter);
router.use(gatewayRouter);
router.use(reportsRouter);

export default router;
