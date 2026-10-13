import { AppError } from "../../../middlewares/Errors/appError.js";
import { withTransaction } from "../../../shared/database/withTransaction.js";
import { buildPaginatedResult } from "../../../shared/http/pagination.js";
import { getNextSequenceNumber } from "../../../shared/numberSequence/numberSequence.service.js";
import { CustomerModel } from "../../customers/customer.model.js";
import { SupplierModel } from "../../suppliers/supplier.model.js";
import { SalesInvoiceModel } from "../../sales/sales-invoices/salesInvoice.model.js";
import { PurchaseInvoiceModel } from "../../purchases/purchase-invoices/purchaseInvoice.model.js";
import { recordLedgerEntry } from "../ledger/ledgerEntry.service.js";
import {
  PaymentModel,
  type PaymentDirection,
  type PaymentMethod,
} from "./payment.model.js";

function buildInvoicePaymentPipeline(amountDelta: number) {
  return [
    { $set: { paidAmount: { $add: ["$paidAmount", amountDelta] } } },
    { $set: { remainingAmount: { $subtract: ["$totalAmount", "$paidAmount"] } } },
    {
      $set: {
        status: {
          $switch: {
            branches: [
              { case: { $lte: ["$remainingAmount", 0] }, then: "paid" },
              { case: { $lt: ["$remainingAmount", "$totalAmount"] }, then: "partial" },
            ],
            default: "unpaid",
          },
        },
      },
    },
  ];
}

export interface CreatePaymentInput {
  direction: PaymentDirection;
  customerId?: string;
  supplierId?: string;
  amount: number;
  paymentDate: Date;
  method: PaymentMethod;
  relatedInvoiceId?: string;
}

async function createCollection(input: CreatePaymentInput) {
  if (!input.customerId) {
    throw new AppError("يجب تحديد العميل للتحصيل", 400);
  }

  return withTransaction(async (session) => {
    const customer = await CustomerModel.findById(input.customerId).session(session);
    if (!customer) throw new AppError("العميل غير موجود", 404);

    await CustomerModel.updateOne(
      { _id: customer._id },
      { $inc: { balance: -input.amount } },
      { session }
    );

    if (input.relatedInvoiceId) {
      const invoice = await SalesInvoiceModel.findOneAndUpdate(
        { _id: input.relatedInvoiceId },
        buildInvoicePaymentPipeline(input.amount),
        { session, updatePipeline: true }
      );
      if (!invoice) throw new AppError("فاتورة البيع المرتبطة غير موجودة", 404);
    }

    const paymentNumber = await getNextSequenceNumber("PAY", { session });

    const [payment] = await PaymentModel.create(
      [
        {
          paymentNumber,
          direction: "collection",
          customerId: customer._id,
          customerName: customer.name,
          amount: input.amount,
          paymentDate: input.paymentDate,
          method: input.method,
          ...(input.relatedInvoiceId ? { relatedInvoiceId: input.relatedInvoiceId } : {}),
          status: "completed",
        },
      ],
      { session }
    );
    if (!payment) throw new AppError("تعذر إنشاء التحصيل", 500);

    await recordLedgerEntry(
      {
        partyType: "customer",
        partyId: customer._id,
        date: input.paymentDate,
        sourceType: "collection",
        sourceId: payment._id,
        description: `تحصيل ${paymentNumber}`,
        debit: 0,
        credit: input.amount,
      },
      session
    );

    return payment;
  });
}

async function createSupplierPayment(input: CreatePaymentInput) {
  if (!input.supplierId) {
    throw new AppError("يجب تحديد المورد للسداد", 400);
  }

  return withTransaction(async (session) => {
    const supplier = await SupplierModel.findById(input.supplierId).session(session);
    if (!supplier) throw new AppError("المورد غير موجود", 404);

    await SupplierModel.updateOne(
      { _id: supplier._id },
      { $inc: { balance: -input.amount } },
      { session }
    );

    if (input.relatedInvoiceId) {
      const invoice = await PurchaseInvoiceModel.findOneAndUpdate(
        { _id: input.relatedInvoiceId },
        buildInvoicePaymentPipeline(input.amount),
        { session, updatePipeline: true }
      );
      if (!invoice) throw new AppError("فاتورة الشراء المرتبطة غير موجودة", 404);
    }

    const paymentNumber = await getNextSequenceNumber("PAY", { session });

    const [payment] = await PaymentModel.create(
      [
        {
          paymentNumber,
          direction: "payment",
          supplierId: supplier._id,
          supplierName: supplier.name,
          amount: input.amount,
          paymentDate: input.paymentDate,
          method: input.method,
          ...(input.relatedInvoiceId ? { relatedInvoiceId: input.relatedInvoiceId } : {}),
          status: "completed",
        },
      ],
      { session }
    );
    if (!payment) throw new AppError("تعذر إنشاء السداد", 500);

    await recordLedgerEntry(
      {
        partyType: "supplier",
        partyId: supplier._id,
        date: input.paymentDate,
        sourceType: "payment",
        sourceId: payment._id,
        description: `سداد ${paymentNumber}`,
        debit: input.amount,
        credit: 0,
      },
      session
    );

    return payment;
  });
}

export async function createPayment(input: CreatePaymentInput) {
  if (input.direction === "collection") {
    return createCollection(input);
  }
  return createSupplierPayment(input);
}

export async function voidPayment(id: string, voidReason: string) {
  return withTransaction(async (session) => {
    const payment = await PaymentModel.findById(id).session(session);
    if (!payment) {
      throw new AppError("السجل غير موجود", 404);
    }
    if (payment.status === "voided") {
      throw new AppError("هذه العملية ملغاة بالفعل", 409);
    }

    if (payment.direction === "collection") {
      if (!payment.customerId) throw new AppError("بيانات العميل ناقصة", 500);

      await CustomerModel.updateOne(
        { _id: payment.customerId },
        { $inc: { balance: payment.amount } },
        { session }
      );

      if (payment.relatedInvoiceId) {
        await SalesInvoiceModel.findOneAndUpdate(
          { _id: payment.relatedInvoiceId },
          buildInvoicePaymentPipeline(-payment.amount),
          { session, updatePipeline: true }
        );
      }

      await recordLedgerEntry(
        {
          partyType: "customer",
          partyId: payment.customerId,
          date: new Date(),
          sourceType: "collection",
          sourceId: payment._id,
          description: `إلغاء تحصيل ${payment.paymentNumber}`,
          debit: payment.amount,
          credit: 0,
        },
        session
      );
    } else {
      if (!payment.supplierId) throw new AppError("بيانات المورد ناقصة", 500);

      await SupplierModel.updateOne(
        { _id: payment.supplierId },
        { $inc: { balance: payment.amount } },
        { session }
      );

      if (payment.relatedInvoiceId) {
        await PurchaseInvoiceModel.findOneAndUpdate(
          { _id: payment.relatedInvoiceId },
          buildInvoicePaymentPipeline(-payment.amount),
          { session, updatePipeline: true }
        );
      }

      await recordLedgerEntry(
        {
          partyType: "supplier",
          partyId: payment.supplierId,
          date: new Date(),
          sourceType: "payment",
          sourceId: payment._id,
          description: `إلغاء سداد ${payment.paymentNumber}`,
          debit: 0,
          credit: payment.amount,
        },
        session
      );
    }

    payment.status = "voided";
    payment.voidReason = voidReason;
    await payment.save({ session });

    return payment;
  });
}

export async function getPaymentById(id: string) {
  const payment = await PaymentModel.findById(id);
  if (!payment) {
    throw new AppError("السجل غير موجود", 404);
  }
  return payment;
}

interface ListPaymentsOptions {
  direction?: string | undefined;
  customerId?: string | undefined;
  supplierId?: string | undefined;
  status?: string | undefined;
  page: number;
  limit: number;
}

export async function listPayments(options: ListPaymentsOptions) {
  const filter: Record<string, unknown> = {};
  if (options.direction) filter.direction = options.direction;
  if (options.customerId) filter.customerId = options.customerId;
  if (options.supplierId) filter.supplierId = options.supplierId;
  if (options.status) filter.status = options.status;

  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    PaymentModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(options.limit),
    PaymentModel.countDocuments(filter),
  ]);

  return buildPaginatedResult(items, total, options.page, options.limit);
}
