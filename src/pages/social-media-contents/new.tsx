import { Routes } from "@blitzjs/next"
import Link from "next/link"
import { useRouter } from "next/router"
import { useMutation } from "@blitzjs/rpc"
import Layout from "src/core/layouts/Layout"
import { CreateSocialMediaContentSchema } from "src/social-media-contents/schemas"
import createSocialMediaContent from "src/social-media-contents/mutations/createSocialMediaContent"
import {
  SocialMediaContentForm,
  FORM_ERROR,
} from "src/social-media-contents/components/SocialMediaContentForm"
import { Suspense } from "react"

const NewSocialMediaContentPage = () => {
  const router = useRouter()
  const [createSocialMediaContentMutation] = useMutation(createSocialMediaContent)

  return (
    <Layout title={"Create New SocialMediaContent"}>
      <h1>Create New SocialMediaContent</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <SocialMediaContentForm
          submitText="Create SocialMediaContent"
          schema={CreateSocialMediaContentSchema}
          // initialValues={{}}
          onSubmit={async (values) => {
            try {
              const socialMediaContent = await createSocialMediaContentMutation(values)
              await router.push(
                Routes.ShowSocialMediaContentPage({
                  socialMediaContentId: socialMediaContent.id,
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
      <p>
        <Link href={Routes.SocialMediaContentsPage()}>SocialMediaContents</Link>
      </p>
    </Layout>
  )
}

NewSocialMediaContentPage.authenticate = true

export default NewSocialMediaContentPage
