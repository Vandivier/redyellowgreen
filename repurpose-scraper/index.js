require("dotenv").config()

const puppeteer = require("puppeteer")
const createCsvWriter = require("csv-writer").createObjectCsvWriter
const fs = require("fs")

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

async function main() {
  const csvPath = "initial_social_data.csv"
  const startFromScrapeCache = process.env.START_FROM_SCRAPE_CACHE === "true"
  const shouldResume = startFromScrapeCache && fs.existsSync(csvPath)

  const browser = await puppeteer.launch({
    headless: "new",
  })
  const page = await browser.newPage()

  await page.goto("https://my.repurpose.io/login")
  await page.type('input[id="login-email"]', process.env.REPURPOSE_USERNAME)
  await page.type('input[id="login-password"]', process.env.REPURPOSE_PASSWORD)
  await page.click('button[data-action="submit"]')

  // Wait for navigation to complete
  await page.waitForNavigation({ waitUntil: "networkidle0" })

  // Initialize the CSV file and writer
  let currentPage = 1
  let lastScrapedPage = 1
  let csvWriter

  if (shouldResume) {
    const csvData = fs.readFileSync(csvPath, "utf-8").trim().split("\n")
    const lastLine = csvData[csvData.length - 1]
    const lastRecord = lastLine.split(",")
    lastScrapedPage = parseInt(lastRecord[4]) || 1
    currentPage = lastScrapedPage
  }

  if (currentPage === 1) {
    csvWriter = createCsvWriter({
      path: csvPath,
      header: [
        { id: "tiktokUrl", title: "TikTok URL" },
        { id: "youtubeUrl", title: "YouTube URL" },
        { id: "publishedAt", title: "Published At" },
        { id: "tiktokDescription", title: "TikTok Description" },
        { id: "currentPage", title: "Current Page" },
        { id: "scrapedAt", title: "Scraped At" },
      ],
    })
  } else {
    csvWriter = createCsvWriter({
      path: csvPath,
      header: [
        { id: "tiktokUrl", title: "TikTok URL" },
        { id: "youtubeUrl", title: "YouTube URL" },
        { id: "publishedAt", title: "Published At" },
        { id: "tiktokDescription", title: "TikTok Description" },
        { id: "currentPage", title: "Current Page" },
        { id: "scrapedAt", title: "Scraped At" },
      ],
      append: true,
    })

    console.log(`Resuming scraping from page ${lastScrapedPage}`)
  }

  let hasNextPage = true
  let totalPages

  while (hasNextPage) {
    // Navigate to the target page
    await page.goto(`https://my.repurpose.io/viewEpisodes/139229?page=${currentPage}`, {
      waitUntil: "networkidle0",
    })

    // Extract the required information from each 'tr' element
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

    // Filter out duplicates based on tiktokUrl
    const filteredData = data.filter(
      (record, index, self) => index === self.findIndex((r) => r.tiktokUrl === record.tiktokUrl)
    )

    // Write the filtered data into the CSV file
    const scrapedAt = new Date().toISOString()
    const records = filteredData.map((record) => ({
      ...record,
      currentPage,
      scrapedAt,
    }))
    await csvWriter.writeRecords(records)

    // Get the total number of pages
    if (!totalPages) {
      totalPages = await page.evaluate(() => {
        const nextPageLink = document.querySelector('[rel="next"]')
        return Number(nextPageLink.parentElement.previousElementSibling.innerText)
      })
    }

    // Check if there is a next page
    hasNextPage = await page.evaluate(() => {
      const nextPageLink = document.querySelector('[rel="next"]')
      return nextPageLink !== null
    })

    console.log(
      `Done scraping page ${currentPage} out of ${totalPages} pages. hasNextPage: ${hasNextPage}`
    )

    // Generate a random pause between 2-6 seconds
    // to avoid getting blocked by the server
    const pauseDuration = getRandomNumber(2000, 6000)
    await page.waitForTimeout(pauseDuration)
    currentPage++
  }

  await browser.close()

  // Filter out blank lines from CSV
  const csvData = fs.readFileSync(csvPath, "utf-8").trim().split("\n")

  // Sort the rows by TikTok URL
  const sortedCsvData = csvData.sort((a, b) => {
    const urlA = a.split(",")[0].toLowerCase()
    const urlB = b.split(",")[0].toLowerCase()
    return urlA.localeCompare(urlB)
  })

  const cleanedCsvPath = "final_social_data.csv"
  const filteredCsvData = sortedCsvData.filter((line) => line.trim() !== "")
  fs.writeFileSync(cleanedCsvPath, filteredCsvData.join("\n"))
}

main()
