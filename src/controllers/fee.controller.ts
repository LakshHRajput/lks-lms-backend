import type { Response } from "express";

import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import {
  createFee,
  deleteFee,
  getFeeById,
  listFees,
  updateFee
} from "../services/fee.service.js";
import {
  createFeeSchema,
  feeListQuerySchema,
  updateFeeSchema
} from "../validations/fee.validation.js";

export const getFees = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const query = feeListQuerySchema.parse(req.query);
  const result = await listFees(req.user, query);

  return res.status(200).json({
    success: true,
    message: "Fees fetched successfully",
    data: result.data,
    pagination: result.pagination
  });
};

export const getFee = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const feeId = Number(req.params.id);
  const fee = await getFeeById(req.user, feeId);

  return res.status(200).json({
    success: true,
    message: "Fee fetched successfully",
    data: fee
  });
};

export const createNewFee = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const input = createFeeSchema.parse(req.body);
  const fee = await createFee(req.user, input);

  return res.status(201).json({
    success: true,
    message: "Fee created successfully",
    data: fee
  });
};

export const updateFeeById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const feeId = Number(req.params.id);
  const input = updateFeeSchema.parse(req.body);
  const fee = await updateFee(req.user, feeId, input);

  return res.status(200).json({
    success: true,
    message: "Fee updated successfully",
    data: fee
  });
};

export const deleteFeeById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const feeId = Number(req.params.id);
  const result = await deleteFee(req.user, feeId);

  return res.status(200).json({
    success: true,
    message: result.message
  });
};
