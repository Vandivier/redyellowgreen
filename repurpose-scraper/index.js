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

  // Extract the required information from each 'tr' element
  const data = await page.$$eval("tr.press_item", (trs) =>
    trs.map((tr) => {
      const anchors = Array.from(tr.querySelectorAll("a"))
      const tiktokUrl = anchors.find((a) => a.href.includes("tiktok.com"))?.href
      const youtubeUrl = anchors.find((a) => a.href.includes("youtube.com"))?.href
      const tiktokDescription = tr.querySelector("div.sub-epis-title")?.innerText

      const publishedAtParagraph = tr.querySelector('p[class*="published_date_time_"]')
      const publishedAt = publishedAtParagraph ? publishedAtParagraph.innerText : null
      const repurposeId = publishedAtParagraph
        ? publishedAtParagraph.className.split("_").pop()
        : null

      return {
        tiktokUrl,
        youtubeUrl,
        publishedAt,
        tiktokDescription,
        repurposeId,
      }
    })
  )

  await browser.close()

  // Write the scraped data into a CSV file
  const csvWriter = createCsvWriter({
    path: "social_data.csv",
    header: [
      { id: "tiktokUrl", title: "TikTok URL" },
      { id: "youtubeUrl", title: "YouTube URL" },
      { id: "publishedAt", title: "Published At" },
      { id: "tiktokDescription", title: "TikTok Description" },
      { id: "repurposeId", title: "Repurpose ID" },
    ],
  })

  await csvWriter.writeRecords(data)
}

main()
