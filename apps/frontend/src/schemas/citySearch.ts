import { z } from "zod";

export const citySearchSchema = z.object({
  city: z
    .string()
    .trim()
    .min(1, "Please enter a city or town name.")
    .min(2, "City name must be at least 2 characters.")
    .max(100, "City name must be at most 100 characters.")
    .regex(
      /^[a-zA-ZÀ-ÿ\s\-'.]+$/,
      "City name can only contain letters, spaces, hyphens, and apostrophes."
    ),
});

export type CitySearchValues = z.infer<typeof citySearchSchema>;
