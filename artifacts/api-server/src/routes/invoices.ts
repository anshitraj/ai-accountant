import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { invoicesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { GetInvoicesResponse, CreateInvoiceBody } from "@workspace/api-zod";

const router: IRouter = Router();

const mapInvoice = (inv: typeof invoicesTable.$inferSelect) => ({
  id: inv.id,
  invoiceNumber: inv.invoiceNumber,
  vendorName: inv.vendorName,
  customerName: inv.customerName ?? null,
  gstin: inv.gstin ?? null,
  date: inv.date,
  amount: parseFloat(inv.amount as string),
  gstAmount: inv.gstAmount ? parseFloat(inv.gstAmount as string) : null,
  type: inv.type,
  paymentStatus: inv.paymentStatus,
  status: inv.status,
  linkedTransactionId: inv.linkedTransactionId ?? null,
});

router.get("/invoices", async (req, res): Promise<void> => {
  let invs = await db.select().from(invoicesTable).orderBy(desc(invoicesTable.date));

  const { status, search } = req.query as { status?: string; search?: string };

  if (status) {
    invs = invs.filter(i => i.status === status);
  }
  if (search) {
    const q = search.toLowerCase();
    invs = invs.filter(i =>
      i.invoiceNumber.toLowerCase().includes(q) ||
      i.vendorName.toLowerCase().includes(q) ||
      (i.gstin?.toLowerCase().includes(q) ?? false)
    );
  }

  res.json(GetInvoicesResponse.parse(invs.map(mapInvoice)));
});

router.post("/invoices", async (req, res): Promise<void> => {
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [inv] = await db.insert(invoicesTable).values({
    invoiceNumber: parsed.data.invoiceNumber,
    vendorName: parsed.data.vendorName,
    customerName: parsed.data.customerName ?? null,
    gstin: parsed.data.gstin ?? null,
    date: parsed.data.date,
    amount: parsed.data.amount.toString(),
    gstAmount: parsed.data.gstAmount?.toString() ?? null,
    type: parsed.data.type,
  }).returning();

  res.status(201).json(mapInvoice(inv));
});

export default router;
