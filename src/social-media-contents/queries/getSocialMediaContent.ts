import { NotFoundError } from "blitz"
import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

const GetSocialMediaContent = z.object({
  // This accepts type of undefined, but is required at runtime
  id: z.number().optional().refine(Boolean, "Required"),
})

export default resolver.pipe(
  resolver.zod(GetSocialMediaContent),
  resolver.authorize(),
  async ({ id }) => {
    // TODO: in multi-tenant app, you must add validation to ensure correct tenant
    const socialMediaContent = await db.socialMediaContent.findFirst({
      where: { id },
    })

    if (!socialMediaContent) throw new NotFoundError()

    return socialMediaContent
  }
)
