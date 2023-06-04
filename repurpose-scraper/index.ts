import * as dotenv from "dotenv"
dotenv.config()

import puppeteer, { Browser, Page } from "puppeteer"
import { createObjectCsvWriter } from "csv-writer"
import fs from "fs"
import { CsvWriter } from "csv-writer/src/lib/csv-writer"
import { ObjectMap } from "csv-writer/src/lib/lang/object"

const workflowContentCsvPath: string = "initial_social_data.csv"
const workflowListCsvPath: string = "workflow_list.csv"
const workflowListUrl: string = "https://my.repurpose.io/"
const workflowNames: string[] = (process.env.REPURPOSE_WORKFLOW_NAMES || "")
  .replace('"', "")
  .split(",")

function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

const pauseBeforeNavigation = async (page: Page): Promise<void> => {
  const pauseDuration: number = getRandomNumber(2000, 6000)
  await page.waitForTimeout(pauseDuration)
}

const todayFormatted = (): string => {
  const date: Date = new Date()
  const month: string = String(date.getMonth() + 1).padStart(2, "0")
  const day: string = String(date.getDate()).padStart(2, "0")
  const year: string = date.getFullYear().toString().substr(-2)

  return `${month}/${day}/${year}`
}

interface WorkflowRecord {
  workflowName: string
  workflowId: string
  totalPages?: number
  pageCountDate?: string
}

async function scrapeWorkflowRecords(
  page: Page,
  csvWriter: CsvWriter<ObjectMap<any>>
): Promise<WorkflowRecord[]> {
  console.log("beginning workflow scrape")
  await page.goto(workflowListUrl, { waitUntil: "domcontentloaded" })
  console.log("done navigating to workflowListUrl")

  // Get workflow names and ids
  const workflowRecords: WorkflowRecord[] = await page.evaluate((_workflowNames) => {
    const rows = Array.from(document.querySelectorAll("tr.press_item")).filter((elRow) =>
      _workflowNames.includes(
        elRow.querySelector<HTMLElement>("div.workflow-name")?.innerText || ""
      )
    )

    return rows.map((elRow) => {
      const workflowName = elRow.querySelector<HTMLElement>("div.workflow-name")?.innerText || ""
      const anchorsInRow = Array.from(elRow.querySelectorAll<HTMLAnchorElement>("a.btn") || [])
      const workflowId =
        anchorsInRow
          .find((elBtn) => elBtn.innerText.toLowerCase() === "view content")
          ?.href.split("/")
          .pop() || ""

      return { workflowName, workflowId }
    })
  }, workflowNames)

  await pauseBeforeNavigation(page)
  console.log("obtained workflowRecords and done with pauseBeforeNavigation")

  // Navigate to each workflow page and get the total number of pages
  for (const record of workflowRecords) {
    console.log(`Counting pages for workflowId: ${record.workflowId}`)

    await page.goto(`https://my.repurpose.io/viewEpisodes/${record.workflowId}?page=1`, {
      timeout: 120000,
      waitUntil: "domcontentloaded",
    })

    record.totalPages = await page.evaluate(() => {
      const nextPageLink = document.querySelector<HTMLElement>('[rel="next"]')

      if (!nextPageLink) {
        // the page sometimes renders differently in chromium
        // normal mode means up to 25 rows of 3 links each
        const normalLinkMaxCount = 75
        const linkCount = document.querySelectorAll(".press_item a[href]").length
        if (linkCount > normalLinkMaxCount) {
          return 1
        } else throw new Error("unknown err trying to count pages for workflow")
      }

      const prevSibling = (nextPageLink.parentElement?.previousElementSibling ||
        new HTMLElement()) as HTMLElement
      const count = Number(prevSibling?.innerText)

      if (Number.isNaN(count)) {
        throw new Error(`Unexpected page count of NaN for workflowId: ${record.workflowId}`)
      }

      return Number(count)
    })
    record.pageCountDate = todayFormatted()

    console.log(
      `Done counting pages for workflow number ${workflowRecords.indexOf(record) + 1} out of ${
        workflowRecords.length
      } workflows.`
    )

    await pauseBeforeNavigation(page)
  }

  await csvWriter.writeRecords(workflowRecords)
  return workflowRecords
}

async function scrapeSocialMediaContentRecords(
  page: Page,
  csvWriter: CsvWriter<ObjectMap<any>>,
  workflowRecords: WorkflowRecord[]
): Promise<void> {
  for (let { workflowId, totalPages } of workflowRecords) {
    if (!totalPages) {
      console.log(`unexpected nullish totalPages for workflowId: ${workflowId}`)
      continue
    }

    // Navigate to the first page to get the total number of pages
    await page.goto(`https://my.repurpose.io/viewEpisodes/${workflowId}?page=1`, {
      waitUntil: "domcontentloaded",
    })

    // Start scraping from the last page and go backwards
    for (let currentPage = totalPages; currentPage >= 1; currentPage--) {
      console.log(`Scraping page ${currentPage} for workflowId: ${workflowId}`)

      await page.goto(`https://my.repurpose.io/viewEpisodes/${workflowId}?page=${currentPage}`, {
        waitUntil: "domcontentloaded",
      })

      const data = await page.$$eval("tr.press_item", (trs) =>
        trs.map((tr) => {
          const anchors = Array.from(tr.querySelectorAll("a"))
          const tiktokUrl = anchors.find((a) => a.href.includes("tiktok.com"))?.href
          const youtubeUrl = anchors.find((a) => a.href.includes("youtube.com"))?.href
          const tiktokDescription = tr.querySelector<HTMLElement>("div.sub-epis-title")?.innerText
          const publishedAtParagraph = tr.querySelector<HTMLElement>(
            'p[class*="published_date_time_"]'
          )
          const publishedAt = publishedAtParagraph ? publishedAtParagraph.innerText : null

          return {
            tiktokUrl,
            youtubeUrl,
            publishedAt,
            tiktokDescription,
          }
        })
      )

      const filteredData = data.filter(
        (record, index, self) => index === self.findIndex((r) => r.tiktokUrl === record.tiktokUrl)
      )

      const scrapedAt = new Date().toISOString()
      const records = filteredData.map((record) => ({
        ...record,
        currentPage,
        scrapedAt,
      }))

      await csvWriter.writeRecords(records)
      console.log(`Done scraping page ${currentPage} out of ${totalPages} pages.`)
      await pauseBeforeNavigation(page)
    }
  }

  const csvData = fs.readFileSync(workflowContentCsvPath, "utf-8").trim().split("\n")
  const sortedCsvData = csvData.sort((a, b) => {
    const urlA = a.split(",")[0].toLowerCase()
    const urlB = b.split(",")[0].toLowerCase()
    return urlA.localeCompare(urlB)
  })
  const cleanedCsvPath = "final_social_data.csv"
  const filteredCsvData = sortedCsvData.filter((line) => line.trim() !== "")
  fs.writeFileSync(cleanedCsvPath, filteredCsvData.join("\n"))
}

async function main() {
  const browser: Browser = await puppeteer.launch({ headless: "new" })
  const page: Page = await browser.newPage()

  if (process.env.WITH_REQUEST_INTERCEPTION === "true") {
    await page.setRequestInterception(true)
    page.on("request", async (req) => {
      if (
        req.resourceType() == "stylesheet" ||
        req.resourceType() == "font" ||
        req.resourceType() == "image" ||
        req.url().includes("widget.frill")
      ) {
        await req.abort()
      } else {
        await req.continue()
      }
    })
  }

  if (!process.env.REPURPOSE_USERNAME || !process.env.REPURPOSE_PASSWORD) {
    throw new Error("Invalid REPURPOSE_USERNAME or REPURPOSE_PASSWORD")
  }

  await page.goto("https://my.repurpose.io/login")
  await page.type('input[id="login-email"]', process.env.REPURPOSE_USERNAME)
  await page.type('input[id="login-password"]', process.env.REPURPOSE_PASSWORD)
  await page.click('button[data-action="submit"]')
  await page.waitForNavigation({ waitUntil: "domcontentloaded" })

  const workflowCsvWriter: CsvWriter<ObjectMap<any>> = createObjectCsvWriter({
    path: workflowListCsvPath,
    header: [
      { id: "workflowId", title: "Workflow ID" },
      { id: "workflowName", title: "Workflow Name" },
      { id: "totalPages", title: "Total Pages" },
      { id: "pageCountDate", title: "Page Count Date" },
    ],
  })

  const csvWriter = createObjectCsvWriter({
    path: workflowContentCsvPath,
    header: [
      { id: "tiktokUrl", title: "TikTok URL" },
      { id: "youtubeUrl", title: "YouTube URL" },
      { id: "publishedAt", title: "Published At" },
      { id: "tiktokDescription", title: "TikTok Description" },
      { id: "currentPage", title: "Current Page" },
      { id: "scrapedAt", title: "Scraped At" },
    ],
    append: process.env.START_FROM_SCRAPE_CACHE === "true",
  })

  const workflowRecords = await scrapeWorkflowRecords(page, workflowCsvWriter)
  await scrapeSocialMediaContentRecords(page, csvWriter, workflowRecords)

  await browser.close()
}

main().catch((err) =>
  console.log("Repurpose Scraper ended ungracefully with the following error", err)
)
