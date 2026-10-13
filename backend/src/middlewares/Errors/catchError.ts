import type { NextFunction, Request, Response } from "express";

export function catchError(
  callBack: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    callBack(req, res, next).catch((err) => {
      next(err);
    });
  };
}
