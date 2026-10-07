import prisma from "../config/database.js";
import type {
  CreateFeeInput,
  FeeListQueryInput,
  UpdateFeeInput
} from "../validations/fee.validation.js";
import type {
  CreatePaymentInput,
  PaymentListQueryInput,
  UpdatePaymentInput
} from "../validations/payment.validation.js";

const feeSelect = {
  id: true,
  studentId: true,
  title: true,
  amount: true,
  paidAmount: true,
  dueDate: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  student: {
    select: {
      id: true,
      studentCode: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  },
  payments: {
    select: {
      id: true,
      amount: true,
      paymentMethod: true,
      transactionId: true,
      status: true,
      paidAt: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  }
} as const;

const paymentSelect = {
  id: true,
  feeId: true,
  createdById: true,
  amount: true,
  transactionId: true,
  paymentMethod: true,
  status: true,
  paidAt: true,
  createdAt: true,
  fee: {
    select: {
      id: true,
      title: true,
      studentId: true,
      amount: true,
      paidAmount: true,
      status: true,
      student: {
        select: {
          id: true,
          studentCode: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      }
    }
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  }
} as const;

const getStudentProfileId = async (userId: number) => {
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { id: true }
  });

  return studentProfile?.id ?? null;
};

const normalizeFeeStatus = (paidAmount: number, totalAmount: number) => {
  if (paidAmount <= 0) {
    return "PENDING";
  }

  if (paidAmount >= totalAmount) {
    return "PAID";
  }

  return "PARTIAL";
};

const refreshFeeSummary = async (feeId: number) => {
  const fee = await prisma.fee.findUnique({
    where: { id: feeId },
    select: {
      amount: true,
      payments: {
        select: {
          amount: true
        }
      }
    }
  });

  if (!fee) {
    return;
  }

  const paidAmount = fee.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const status = normalizeFeeStatus(paidAmount, Number(fee.amount));

  await prisma.fee.update({
    where: { id: feeId },
    data: {
      paidAmount,
      status
    }
  });
};

export const listFees = async (
  actor: { userId: number; role: string },
  query: FeeListQueryInput
) => {
  const baseWhere: Record<string, unknown> = {};

  if (typeof query.studentId === "number") {
    baseWhere.studentId = query.studentId;
  }

  if (query.status) {
    baseWhere.status = query.status;
  }

  if (query.search) {
    const search = query.search.trim();
    baseWhere.OR = [
      { title: { contains: search } },
      { student: { user: { name: { contains: search } } } }
    ];
  }

  if (actor.role === "STUDENT") {
    const studentId = await getStudentProfileId(actor.userId);

    if (!studentId) {
      return {
        data: [],
        pagination: {
          page: query.page,
          limit: query.limit,
          total: 0,
          totalPages: 1
        }
      };
    }

    baseWhere.studentId = studentId;
  }

  const [fees, total] = await Promise.all([
    prisma.fee.findMany({
      where: baseWhere,
      select: feeSelect,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: [{ dueDate: "asc" }, { id: "asc" }]
    }),
    prisma.fee.count({ where: baseWhere })
  ]);

  return {
    data: fees,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1
    }
  };
};

export const getFeeById = async (
  actor: { userId: number; role: string },
  feeId: number
) => {
  const fee = await prisma.fee.findUnique({
    where: { id: feeId },
    select: feeSelect
  });

  if (!fee) {
    throw new Error("Fee record not found");
  }

  if (actor.role === "STUDENT") {
    const studentId = await getStudentProfileId(actor.userId);

    if (!studentId || fee.studentId !== studentId) {
      throw new Error("Fee record not found or access denied");
    }
  }

  return fee;
};

export const createFee = async (
  actor: { userId: number; role: string },
  input: CreateFeeInput
) => {
  if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to create fee records");
  }

  const fee = await prisma.fee.create({
    data: {
      studentId: input.studentId,
      title: input.title,
      amount: input.amount,
      paidAmount: 0,
      dueDate: input.dueDate ?? null,
      status: input.status
    },
    select: feeSelect
  });

  return fee;
};

export const updateFee = async (
  actor: { userId: number; role: string },
  feeId: number,
  input: UpdateFeeInput
) => {
  if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to update fee records");
  }

  const existing = await prisma.fee.findUnique({
    where: { id: feeId },
    select: { id: true, amount: true, paidAmount: true }
  });

  if (!existing) {
    throw new Error("Fee record not found");
  }

  const fee = await prisma.fee.update({
    where: { id: feeId },
    data: {
      ...(input.title ? { title: input.title } : {}),
      ...(typeof input.amount !== "undefined" ? { amount: input.amount } : {}),
      ...(typeof input.dueDate !== "undefined" ? { dueDate: input.dueDate } : {}),
      ...(input.status ? { status: input.status } : {})
    },
    select: feeSelect
  });

  return fee;
};

export const deleteFee = async (
  actor: { userId: number; role: string },
  feeId: number
) => {
  if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to delete fee records");
  }

  const fee = await prisma.fee.findUnique({
    where: { id: feeId },
    select: { id: true }
  });

  if (!fee) {
    throw new Error("Fee record not found");
  }

  await prisma.fee.delete({ where: { id: feeId } });

  return { message: "Fee record deleted successfully" };
};

export const listPayments = async (
  actor: { userId: number; role: string },
  query: PaymentListQueryInput
) => {
  const baseWhere: Record<string, unknown> = {};

  if (typeof query.feeId === "number") {
    baseWhere.feeId = query.feeId;
  }

  if (typeof query.studentId === "number") {
    baseWhere.fee = {
      ...(baseWhere.fee as Record<string, unknown> | undefined),
      studentId: query.studentId
    };
  }

  if (query.status) {
    baseWhere.status = query.status;
  }

  if (actor.role === "STUDENT") {
    const studentId = await getStudentProfileId(actor.userId);

    if (!studentId) {
      return {
        data: [],
        pagination: {
          page: query.page,
          limit: query.limit,
          total: 0,
          totalPages: 1
        }
      };
    }

    baseWhere.fee = {
      studentId
    };
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: baseWhere,
      select: paymentSelect,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: [{ paidAt: "desc" }, { id: "desc" }]
    }),
    prisma.payment.count({ where: baseWhere })
  ]);

  return {
    data: payments,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1
    }
  };
};

export const getPaymentById = async (
  actor: { userId: number; role: string },
  paymentId: number
) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: paymentSelect
  });

  if (!payment) {
    throw new Error("Payment record not found");
  }

  if (actor.role === "STUDENT") {
    const studentId = await getStudentProfileId(actor.userId);

    if (!studentId || payment.fee.studentId !== studentId) {
      throw new Error("Payment record not found or access denied");
    }
  }

  return payment;
};

export const createPayment = async (
  actor: { userId: number; role: string },
  input: CreatePaymentInput
) => {
  const fee = await prisma.fee.findUnique({
    where: { id: input.feeId },
    select: {
      id: true,
      amount: true,
      paidAmount: true,
      studentId: true,
      status: true
    }
  });

  if (!fee) {
    throw new Error("Fee record not found");
  }

  if (actor.role === "STUDENT") {
    const studentId = await getStudentProfileId(actor.userId);

    if (!studentId || fee.studentId !== studentId) {
      throw new Error("You do not have permission to pay this fee");
    }
  }

  const payment = await prisma.payment.create({
    data: {
      feeId: fee.id,
      createdById: actor.userId,
      amount: input.amount,
      transactionId: input.transactionId ?? null,
      paymentMethod: input.paymentMethod ?? null,
      status: input.status,
      paidAt: new Date()
    },
    select: paymentSelect
  });

  const updatedFeeAmount = Number(fee.paidAmount) + Number(input.amount);
  const nextStatus = normalizeFeeStatus(updatedFeeAmount, Number(fee.amount));

  await prisma.fee.update({
    where: { id: fee.id },
    data: {
      paidAmount: updatedFeeAmount,
      status: nextStatus
    }
  });

  return payment;
};

export const updatePayment = async (
  actor: { userId: number; role: string },
  paymentId: number,
  input: UpdatePaymentInput
) => {
  if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to update payment records");
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      feeId: true,
      amount: true,
      fee: {
        select: {
          amount: true,
          paidAmount: true
        }
      }
    }
  });

  if (!payment) {
    throw new Error("Payment record not found");
  }

  const updatedPayment = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      ...(typeof input.amount !== "undefined" ? { amount: input.amount } : {}),
      ...(typeof input.paymentMethod !== "undefined" ? { paymentMethod: input.paymentMethod } : {}),
      ...(typeof input.transactionId !== "undefined" ? { transactionId: input.transactionId } : {}),
      ...(input.status ? { status: input.status } : {})
    },
    select: paymentSelect
  });

  await refreshFeeSummary(payment.feeId);

  return updatedPayment;
};

export const deletePayment = async (
  actor: { userId: number; role: string },
  paymentId: number
) => {
  if (!["SUPER_ADMIN", "ADMIN"].includes(actor.role)) {
    throw new Error("You do not have permission to delete payment records");
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, feeId: true }
  });

  if (!payment) {
    throw new Error("Payment record not found");
  }

  await prisma.payment.delete({ where: { id: paymentId } });
  await refreshFeeSummary(payment.feeId);

  return { message: "Payment record deleted successfully" };
};
