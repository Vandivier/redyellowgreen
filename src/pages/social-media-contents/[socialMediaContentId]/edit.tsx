import { Suspense } from "react"
import { Routes } from "@blitzjs/next"
import Head from "next/head"
import Link from "next/link"
import { useRouter } from "next/router"
import { useQuery, useMutation } from "@blitzjs/rpc"
import { useParam } from "@blitzjs/next"

import Layout from "src/core/layouts/Layout"
import { UpdateSocialMediaContentSchema } from "src/social-media-contents/schemas"
import getSocialMediaContent from "src/social-media-contents/queries/getSocialMediaContent"
import updateSocialMediaContent from "src/social-media-contents/mutations/updateSocialMediaContent"
import {
  SocialMediaContentForm,
  FORM_ERROR,
} from "src/social-media-contents/components/SocialMediaContentForm"

export const EditSocialMediaContent = () => {
  const router = useRouter()
  const socialMediaContentId = useParam("socialMediaContentId", "number")
  const [socialMediaContent, { setQueryData }] = useQuery(
    getSocialMediaContent,
    { id: socialMediaContentId },
    {
      // This ensures the query never refreshes and overwrites the form data while the user is editing.
      staleTime: Infinity,
    }
  )
  const [updateSocialMediaContentMutation] = useMutation(updateSocialMediaContent)

  return (
    <>
      <Head>
        <title>Edit SocialMediaContent {socialMediaContent.id}</title>
      </Head>

      <div>
        <h1>Edit SocialMediaContent {socialMediaContent.id}</h1>
        <pre>{JSON.stringify(socialMediaContent, null, 2)}</pre>
        <Suspense fallback={<div>Loading...</div>}>
          <SocialMediaContentForm
            submitText="Update SocialMediaContent"
            schema={UpdateSocialMediaContentSchema}
            initialValues={socialMediaContent}
            onSubmit={async (values) => {
              try {
                const updated = await updateSocialMediaContentMutation({
                  id: socialMediaContent.id,
                  ...values,
                })
                await setQueryData(updated)
                await router.push(
                  Routes.ShowSocialMediaContentPage({
                    socialMediaContentId: updated.id,
                  })
                )
              } catch (error: any) {
                console.error(error)
                return {
                  [FORM_ERROR]: error.toString(),
                }
              }
            }}
          />
        </Suspense>
      </div>
    </>
  )
}

const EditSocialMediaContentPage = () => {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <EditSocialMediaContent />
      </Suspense>

      <p>
        <Link href={Routes.SocialMediaContentsPage()}>SocialMediaContents</Link>
      </p>
    </div>
  )
}

EditSocialMediaContentPage.authenticate = true
EditSocialMediaContentPage.getLayout = (page) => <Layout>{page}</Layout>

export default EditSocialMediaContentPage
