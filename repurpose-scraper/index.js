require("dotenv").config()

const puppeteer = require("puppeteer")
const createCsvWriter = require("csv-writer").createObjectCsvWriter

async function main() {
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

  // Navigate to the target page
  await page.goto("https://my.repurpose.io/viewEpisodes/139229")

  // Find all 'tr' elements and extract URLs from 'a' elements
  const urls = await page.$$eval("tr", (trs) =>
    trs.map((tr) => Array.from(tr.querySelectorAll("a"), (a) => a.href)).flat()
  )

  await browser.close()

  // Write the scraped URLs into a CSV file
  const csvWriter = createCsvWriter({
    path: "social_data.csv",
    header: [{ id: "url", title: "URL" }],
  })

  const records = urls.map((url) => ({ url: url }))
  await csvWriter.writeRecords(records)
}

main()
