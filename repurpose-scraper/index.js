require("dotenv").config()

const puppeteer = require("puppeteer")
const createCsvWriter = require("csv-writer").createObjectCsvWriter
const fs = require("fs")

const workflowListCsvPath = "workflow_list.csv"
const workflowListUrl = "https://my.repurpose.io/"
const workflowNames = (process.env.REPURPOSE_WORKFLOW_NAMES || "").replace('"', "").split(",")

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

const pauseBeforeNavigation = async (page) => {
  const pauseDuration = getRandomNumber(2000, 6000)
  await page.waitForTimeout(pauseDuration)
}

const todayFormatted = () => {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, "0") // pad single digit with leading zero
  const day = String(date.getDate()).padStart(2, "0") // pad single digit with leading zero
  const year = date.getFullYear().toString().substr(-2) // get last two digits of year

  return `${month}/${day}/${year}`
}

async function scrapeWorkflowRecords(page, csvWriter) {
  console.log("beginning workflow scrape")
  await page.goto(workflowListUrl, { waitUntil: "domcontentloaded" })
  console.log("done navigating to workflowListUrl")

  // Get workflow names and ids
  const workflowRecords = await page.evaluate((_workflowNames) => {
    const rows = Array.from(document.querySelectorAll("tr.press_item")).filter((elRow) =>
      _workflowNames.includes(elRow.querySelector("div.workflow-name").innerText)
    )

    return rows.map((elRow) => {
      const workflowName = elRow.querySelector("div.workflow-name").innerText
      const workflowId = Array.from(elRow.querySelectorAll("a.btn"))
        .find((elBtn) => elBtn.innerText.toLowerCase() === "view content")
        .href.split("/")
        .pop()

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
      const nextPageLink = document.querySelector('[rel="next"]')

      if (!nextPageLink) {
        // the page sometimes renders differently in chromium
        // normal mode means up to 25 rows of 3 links each
        const normalLinkMaxCount = 75
        const linkCount = document.querySelectorAll(".press_item a[href]").length
        if (linkCount > normalLinkMaxCount) {
          return 1
        } else throw new Error("unknown err trying to count pages for workflow")
      }

      return Number(nextPageLink.parentElement.previousElementSibling.innerText)
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

async function scrapeSocialMediaContentRecords(page, csvWriter, workflowRecords) {
  for (let { workflowId } of workflowRecords) {
    console.log(`Scraping page 1 for workflowId: ${workflowId}`)

    // Navigate to the first page to get the total number of pages
    await page.goto(`https://my.repurpose.io/viewEpisodes/${workflowId}?page=1`, {
      waitUntil: "domcontentloaded",
    })
    let totalPages = await page.evaluate(() => {
      const nextPageLink = document.querySelector('[rel="next"]')
      return Number(nextPageLink.parentElement.previousElementSibling.innerText)
    })

    // Start scraping from the last page and go backwards
    for (let currentPage = totalPages; currentPage >= 1; currentPage--) {
      await page.goto(`https://my.repurpose.io/viewEpisodes/${workflowId}?page=${currentPage}`, {
        waitUntil: "domcontentloaded",
      })

      const data = await page.$$eval("tr.press_item", (trs) =>
        trs.map((tr) => {
          const anchors = Array.from(tr.querySelectorAll("a"))
          const tiktokUrl = anchors.find((a) => a.href.includes("tiktok.com"))?.href
          const youtubeUrl = anchors.find((a) => a.href.includes("youtube.com"))?.href
          const tiktokDescription = tr.querySelector("div.sub-epis-title")?.innerText
          const publishedAtParagraph = tr.querySelector('p[class*="published_date_time_"]')
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

  const csvData = fs.readFileSync(csvPath, "utf-8").trim().split("\n")
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
  const browser = await puppeteer.launch({ headless: "new" })
  const page = await browser.newPage()

  if (process.env.WITH_REQUEST_INTERCEPTION) {
    await page.setRequestInterception(true)
    page.on("request", (req) => {
      if (
        req.resourceType() == "stylesheet" ||
        req.resourceType() == "font" ||
        req.resourceType() == "image" ||
        req.url().includes("widget.frill")
      ) {
        req.abort()
      } else {
        req.continue()
      }
    })
  }

  await page.goto("https://my.repurpose.io/login")
  await page.type('input[id="login-email"]', process.env.REPURPOSE_USERNAME)
  await page.type('input[id="login-password"]', process.env.REPURPOSE_PASSWORD)
  await page.click('button[data-action="submit"]')
  await page.waitForNavigation({ waitUntil: "domcontentloaded" })

  const workflowCsvWriter = createCsvWriter({
    path: workflowListCsvPath,
    header: [
      { id: "workflowId", title: "Workflow ID" },
      { id: "workflowName", title: "Workflow Name" },
      { id: "totalPages", title: "Total Pages" },
      { id: "pageCountDate", title: "Page Count Date" },
    ],
  })

  // const csvWriter = createCsvWriter({
  //   path: csvPath,
  //   header: [
  //     { id: "tiktokUrl", title: "TikTok URL" },
  //     { id: "youtubeUrl", title: "YouTube URL" },
  //     { id: "publishedAt", title: "Published At" },
  //     { id: "tiktokDescription", title: "TikTok Description" },
  //     { id: "currentPage", title: "Current Page" },
  //     { id: "scrapedAt", title: "Scraped At" },
  //   ],
  //   append: shouldResume,
  // })

  const workflowRecords = await scrapeWorkflowRecords(page, workflowCsvWriter)
  // await scrapeSocialMediaContentRecords(page, csvWriter, workflowRecords)

  await browser.close()
}

main().catch((err) =>
  console.log("Repurpose Scraper ended ungracefully with the following error", err)
)
