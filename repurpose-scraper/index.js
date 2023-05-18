require("dotenv").config()

const puppeteer = require("puppeteer")
const createCsvWriter = require("csv-writer").createObjectCsvWriter
const fs = require("fs")

const workflowListCsvPath = "workflow_list.csv"
const workflowListUrl = "https://my.repurpose.io/"
const workflowNames = process.env.REPURPOSE_WORKFLOW_NAMES.replace('"', "").split(",")

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

const pauseBeforeNavigation = async (page) => {
  const pauseDuration = getRandomNumber(2000, 6000)
  await page.waitForTimeout(pauseDuration)
}

async function scrapeWorkflowRecords(page, csvWriter) {
  // Navigate to the page with the list of workflows
  await page.goto(workflowListUrl, { waitUntil: "networkidle0" })

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
  debugger

  await pauseBeforeNavigation(page)

  // Navigate to each workflow page and get the total number of pages
  for (const record of workflowRecords) {
    // // TODO: fix below...either they're having a perf issue or limitting me?
    // debugger
    // // 144073
    // // https://my.repurpose.io/viewEpisodes/144073?page=1
    // await page.goto(`https://my.repurpose.io/viewEpisodes/${record.workflowId}?page=1`, {
    //   waitUntil: "networkidle0",
    // })

    // debugger

    // record.totalPages = await page.evaluate(() => {
    //   const nextPageLink = document.querySelector('[rel="next"]')
    //   return Number(nextPageLink.parentElement.previousElementSibling.innerText)
    // })

    console.log(
      `Done scraping workflow number ${workflowRecords.indexOf(record) + 1} out of ${
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
    // Navigate to the first page to get the total number of pages
    await page.goto(`https://my.repurpose.io/viewEpisodes/${workflowId}?page=1`, {
      waitUntil: "networkidle0",
    })
    let totalPages = await page.evaluate(() => {
      const nextPageLink = document.querySelector('[rel="next"]')
      return Number(nextPageLink.parentElement.previousElementSibling.innerText)
    })

    // Start scraping from the last page and go backwards
    for (let currentPage = totalPages; currentPage >= 1; currentPage--) {
      await page.goto(`https://my.repurpose.io/viewEpisodes/${workflowId}?page=${currentPage}`, {
        waitUntil: "networkidle0",
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

  await page.goto("https://my.repurpose.io/login")
  await page.type('input[id="login-email"]', process.env.REPURPOSE_USERNAME)
  await page.type('input[id="login-password"]', process.env.REPURPOSE_PASSWORD)
  await page.click('button[data-action="submit"]')
  await page.waitForNavigation({ waitUntil: "networkidle0" })

  const workflowCsvWriter = createCsvWriter({
    path: workflowListCsvPath,
    header: [
      { id: "workflowId", title: "Workflow ID" },
      { id: "workflowName", title: "Workflow Name" },
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

main()
