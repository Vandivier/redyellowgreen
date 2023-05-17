import React, { Suspense } from "react"
import { Form, FormProps } from "src/core/components/Form"
import { LabeledTextField } from "src/core/components/LabeledTextField"

import { z } from "zod"
export { FORM_ERROR } from "src/core/components/Form"

export function SocialMediaContentForm<S extends z.ZodType<any, any>>(props: FormProps<S>) {
  return (
    <Form<S> {...props}>
      <LabeledTextField
        name="tikTokUrl"
        label="Tik Tok Url"
        placeholder="Tik Tok Url"
        type="text"
      />
      <LabeledTextField
        name="youTubeUrl"
        label="You Tube Url"
        placeholder="You Tube Url"
        type="text"
      />
      <LabeledTextField
        name="publishedAt"
        label="Published At"
        placeholder="Published At"
        type="text"
      />
      <LabeledTextField
        name="description"
        label="Description"
        placeholder="Description"
        type="text"
      />
      <LabeledTextField
        name="currentPage"
        label="Current Page"
        placeholder="Current Page"
        type="number"
      />
      <LabeledTextField name="scrapedAt" label="Scraped At" placeholder="Scraped At" type="text" />
      {/* template: <__component__ name="__fieldName__" label="__Field_Name__" placeholder="__Field_Name__"  type="__inputType__" /> */}
    </Form>
  )
}
