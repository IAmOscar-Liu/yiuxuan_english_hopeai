import { Request } from "express";

export type RequestWithUserId = Request & {
  userId?: string;
};

export type ServiceResponseFailure = {
  success: false;
  statusCode?: number;
  message: any;
};

export type ServiceResponse<T> =
  | {
      success: true;
      statusCode?: number;
      data: T;
    }
  | ServiceResponseFailure;

export type PaginationParams = {
  page?: number;
  limit?: number;
};

export type PaginationResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
