import { Suspense } from "react"
import { Routes } from "@blitzjs/next"
import Head from "next/head"
import Link from "next/link"
import { usePaginatedQuery } from "@blitzjs/rpc"
import { useRouter } from "next/router"
import Layout from "src/core/layouts/Layout"
import getSocialMediaContents from "src/social-media-contents/queries/getSocialMediaContents"

const ITEMS_PER_PAGE = 100

export const SocialMediaContentsList = () => {
  const router = useRouter()
  const page = Number(router.query.page) || 0
  const [{ socialMediaContents, hasMore }] = usePaginatedQuery(getSocialMediaContents, {
    orderBy: { id: "asc" },
    skip: ITEMS_PER_PAGE * page,
    take: ITEMS_PER_PAGE,
  })

  const goToPreviousPage = () => router.push({ query: { page: page - 1 } })
  const goToNextPage = () => router.push({ query: { page: page + 1 } })

  return (
    <div>
      <ul>
        {socialMediaContents.map((socialMediaContent) => (
          <li key={socialMediaContent.id}>
            <Link
              href={Routes.ShowSocialMediaContentPage({
                socialMediaContentId: socialMediaContent.id,
              })}
            >
              {socialMediaContent.name}
            </Link>
          </li>
        ))}
      </ul>

      <button disabled={page === 0} onClick={goToPreviousPage}>
        Previous
      </button>
      <button disabled={!hasMore} onClick={goToNextPage}>
        Next
      </button>
    </div>
  )
}

const SocialMediaContentsPage = () => {
  return (
    <Layout>
      <Head>
        <title>SocialMediaContents</title>
      </Head>

      <div>
        <p>
          <Link href={Routes.NewSocialMediaContentPage()}>Create SocialMediaContent</Link>
        </p>

        <Suspense fallback={<div>Loading...</div>}>
          <SocialMediaContentsList />
        </Suspense>
      </div>
    </Layout>
  )
}

export default SocialMediaContentsPage
