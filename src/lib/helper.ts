import { ServiceResponse } from "../types";
import { Response } from "express";

export function sendJsonResponse<T>(res: Response, result: ServiceResponse<T>) {
  res.status(result.statusCode ?? 200).json(result);
}
