import { z } from "zod"

export const CreateSocialMediaContentSchema = z.object({
  tikTokUrl: z.string(),
  youTubeUrl: z.string(),
  publishedAt: z.string().datetime(),
  description: z.string(),
  currentPage: z.number(),
  scrapedAt: z.string().datetime(),
  // template: __fieldName__: z.__zodType__(),
})
export const UpdateSocialMediaContentSchema = z.object({
  id: z.number(),
  // template: __fieldName__: z.__zodType__(),
})

export const DeleteSocialMediaContentSchema = z.object({
  id: z.number(),
})
