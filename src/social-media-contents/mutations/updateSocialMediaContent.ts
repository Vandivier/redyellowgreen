import { resolver } from "@blitzjs/rpc"
import db from "db"
import { UpdateSocialMediaContentSchema } from "../schemas"

export default resolver.pipe(
  resolver.zod(UpdateSocialMediaContentSchema),
  resolver.authorize(),
  async ({ id, ...data }) => {
    // TODO: in multi-tenant app, you must add validation to ensure correct tenant
    const socialMediaContent = await db.socialMediaContent.update({
      where: { id },
      data,
    })

    return socialMediaContent
  }
)
