import { resolver } from "@blitzjs/rpc"
import db from "db"
import { DeleteSocialMediaContentSchema } from "../schemas"

export default resolver.pipe(
  resolver.zod(DeleteSocialMediaContentSchema),
  resolver.authorize(),
  async ({ id }) => {
    // TODO: in multi-tenant app, you must add validation to ensure correct tenant
    const socialMediaContent = await db.socialMediaContent.deleteMany({
      where: { id },
    })

    return socialMediaContent
  }
)
