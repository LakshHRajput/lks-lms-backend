import type { Response } from "express";

import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import {
  createPayment,
  deletePayment,
  getPaymentById,
  listPayments,
  updatePayment
} from "../services/fee.service.js";
import {
  createPaymentSchema,
  paymentListQuerySchema,
  updatePaymentSchema
} from "../validations/payment.validation.js";

export const getPayments = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const query = paymentListQuerySchema.parse(req.query);
  const result = await listPayments(req.user, query);

  return res.status(200).json({
    success: true,
    message: "Payments fetched successfully",
    data: result.data,
    pagination: result.pagination
  });
};

export const getPayment = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const paymentId = Number(req.params.id);
  const payment = await getPaymentById(req.user, paymentId);

  return res.status(200).json({
    success: true,
    message: "Payment fetched successfully",
    data: payment
  });
};

export const createNewPayment = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const input = createPaymentSchema.parse(req.body);
  const payment = await createPayment(req.user, input);

  return res.status(201).json({
    success: true,
    message: "Payment created successfully",
    data: payment
  });
};

export const updatePaymentById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const paymentId = Number(req.params.id);
  const input = updatePaymentSchema.parse(req.body);
  const payment = await updatePayment(req.user, paymentId, input);

  return res.status(200).json({
    success: true,
    message: "Payment updated successfully",
    data: payment
  });
};

export const deletePaymentById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const paymentId = Number(req.params.id);
  const result = await deletePayment(req.user, paymentId);

  return res.status(200).json({
    success: true,
    message: result.message
  });
};
