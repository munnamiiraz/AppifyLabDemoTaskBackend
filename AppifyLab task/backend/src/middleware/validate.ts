// // src/middleware/validate.ts
// import { NextFunction, Request, Response } from 'express';
// import { AnyZodObject, ZodError } from 'zod';

// // target = 'body' | 'params' | 'query'
// export const validate =
//   (schema: AnyZodObject, target: 'body' | 'params' | 'query' = 'body') =>
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const parsed = await schema.parseAsync(req[target]);
//       // attach validated data somewhere safe for controllers
//       // option A: res.locals.validated = { body: ..., params: ... }
//       res.locals.validated = res.locals.validated || {};
//       res.locals.validated[target] = parsed;
//       return next();
//     } catch (err) {
//       if (err instanceof ZodError) {
//         return res.status(400).json({
//           success: false,
//           message: 'Validation failed',
//           errors: err.format() // structured zod format
//         });
//       }
//       return next(err);
//     }
//   };
