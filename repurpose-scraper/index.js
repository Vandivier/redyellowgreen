require("dotenv").config()

const puppeteer = require("puppeteer")
const createCsvWriter = require("csv-writer").createObjectCsvWriter
const fs = require("fs")

// Function to generate a random number between min and max (inclusive)
function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

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

  // Initialize the CSV file and writer
  const csvPath = "social_data.csv"
  const isFirstPage = !fs.existsSync(csvPath)

  let csvWriter
  if (isFirstPage) {
    csvWriter = createCsvWriter({
      path: csvPath,
      header: [
        { id: "tiktokUrl", title: "TikTok URL" },
        { id: "youtubeUrl", title: "YouTube URL" },
        { id: "publishedAt", title: "Published At" },
        { id: "tiktokDescription", title: "TikTok Description" },
        { id: "repurposeId", title: "Repurpose ID" },
      ],
    })
  } else {
    csvWriter = createCsvWriter({
      path: csvPath,
      header: [],
      append: true,
    })
  }

  let hasNextPage = true
  let currentPage = 1
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

    // Write the scraped data into the CSV file
    await csvWriter.writeRecords(data)

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
    const pauseDuration = getRandomNumber(2000, 6000)
    await page.waitForTimeout(pauseDuration)
    currentPage++

    // if (hasNextPage) {

    //   await page.click('[rel="next"]')
    //   await page.waitForNavigation({ waitUntil: "networkidle0" })
    // }
  }

  await browser.close()
}

main()
