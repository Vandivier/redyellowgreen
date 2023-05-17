import { paginate } from "blitz"
import { resolver } from "@blitzjs/rpc"
import db, { Prisma } from "db"

interface GetSocialMediaContentsInput
  extends Pick<Prisma.SocialMediaContentFindManyArgs, "where" | "orderBy" | "skip" | "take"> {}

export default resolver.pipe(
  resolver.authorize(),
  async ({ where, orderBy, skip = 0, take = 100 }: GetSocialMediaContentsInput) => {
    // TODO: in multi-tenant app, you must add validation to ensure correct tenant
    const {
      items: socialMediaContents,
      hasMore,
      nextPage,
      count,
    } = await paginate({
      skip,
      take,
      count: () => db.socialMediaContent.count({ where }),
      query: (paginateArgs) => db.socialMediaContent.findMany({ ...paginateArgs, where, orderBy }),
    })

    return {
      socialMediaContents,
      nextPage,
      hasMore,
      count,
    }
  }
)
