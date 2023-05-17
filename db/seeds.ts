import db from "./index"
import fs from "fs"
import csv from "csv-parser"

const seed = async () => {
  fs.createReadStream("./repurpose-scraper/initial_social_data.csv")
    .pipe(csv())
    .on("data", async (row) => {
      await db.socialMediaContent.create({
        data: {
          tikTokUrl: row["TikTok URL"],
          youTubeUrl: row["YouTube URL"],
          publishedAt: new Date(row["Published At"].replace(" | ", " ")),
          description: row["TikTok Description"],
          currentPage: parseInt(row["Current Page"]),
          scrapedAt: new Date(row["Scraped At"]),
        },
      })
    })
}

export default seed
