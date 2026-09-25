import { z } from "zod";

export const feedbackCreateSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  channel: z.string().trim().min(1).max(80),
  customerLabel: z.string().trim().max(120).optional(),
  createdAt: z.string().datetime().optional()
});

export const feedbackQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: z.enum(["NEW", "REVIEWED", "ACTIONED"]).optional(),
  sentiment: z.enum(["POS", "NEU", "NEG"]).optional(),
  channel: z.string().trim().optional(),
  themeId: z.string().trim().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10)
}).refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
  message: "dateFrom must be before dateTo"
});

export const feedbackActionSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["NEW", "REVIEWED", "ACTIONED"]).optional(),
  action: z.literal("reclassify").optional()
}).refine((value) => Boolean(value.status) !== Boolean(value.action), "Provide exactly one feedback action");

export type FeedbackCreate = z.infer<typeof feedbackCreateSchema>;
