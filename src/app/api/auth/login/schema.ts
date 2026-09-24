import { z as zod } from "zod";

export const z = {
  credentials: zod.object({
    email: zod.string().email(),
    password: zod.string().min(6),
  }),
  register: zod.object({
    name: zod.string().min(2).max(80),
    email: zod.string().email(),
    password: zod.string().min(6).max(100),
    role: zod.enum(["admin", "reviewer", "officer"]).optional(),
  }),
};
