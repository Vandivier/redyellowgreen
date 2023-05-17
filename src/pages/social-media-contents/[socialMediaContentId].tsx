import { Suspense } from "react"
import { Routes } from "@blitzjs/next"
import Head from "next/head"
import Link from "next/link"
import { useRouter } from "next/router"
import { useQuery, useMutation } from "@blitzjs/rpc"
import { useParam } from "@blitzjs/next"

import Layout from "src/core/layouts/Layout"
import getSocialMediaContent from "src/social-media-contents/queries/getSocialMediaContent"
import deleteSocialMediaContent from "src/social-media-contents/mutations/deleteSocialMediaContent"

export const SocialMediaContent = () => {
  const router = useRouter()
  const socialMediaContentId = useParam("socialMediaContentId", "number")
  const [deleteSocialMediaContentMutation] = useMutation(deleteSocialMediaContent)
  const [socialMediaContent] = useQuery(getSocialMediaContent, {
    id: socialMediaContentId,
  })

  return (
    <>
      <Head>
        <title>SocialMediaContent {socialMediaContent.id}</title>
      </Head>

      <div>
        <h1>SocialMediaContent {socialMediaContent.id}</h1>
        <pre>{JSON.stringify(socialMediaContent, null, 2)}</pre>

        <Link
          href={Routes.EditSocialMediaContentPage({
            socialMediaContentId: socialMediaContent.id,
          })}
        >
          Edit
        </Link>

        <button
          type="button"
          onClick={async () => {
            if (window.confirm("This will be deleted")) {
              await deleteSocialMediaContentMutation({
                id: socialMediaContent.id,
              })
              await router.push(Routes.SocialMediaContentsPage())
            }
          }}
          style={{ marginLeft: "0.5rem" }}
        >
          Delete
        </button>
      </div>
    </>
  )
}

const ShowSocialMediaContentPage = () => {
  return (
    <div>
      <p>
        <Link href={Routes.SocialMediaContentsPage()}>SocialMediaContents</Link>
      </p>

      <Suspense fallback={<div>Loading...</div>}>
        <SocialMediaContent />
      </Suspense>
    </div>
  )
}

ShowSocialMediaContentPage.authenticate = true
ShowSocialMediaContentPage.getLayout = (page) => <Layout>{page}</Layout>

export default ShowSocialMediaContentPage
