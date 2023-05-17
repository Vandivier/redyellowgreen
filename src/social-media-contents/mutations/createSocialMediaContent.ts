import { resolver } from "@blitzjs/rpc"
import db from "db"
import { CreateSocialMediaContentSchema } from "../schemas"

export default resolver.pipe(
  resolver.zod(CreateSocialMediaContentSchema),
  resolver.authorize(),
  async (input) => {
    // TODO: in multi-tenant app, you must add validation to ensure correct tenant
    const socialMediaContent = await db.socialMediaContent.create({
      data: input,
    })

    return socialMediaContent
  }
)
