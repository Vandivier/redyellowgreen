import requests
from bs4 import BeautifulSoup
import csv


def scrape_webpage():
    # Define the URL of the webpage
    url = "https://my.repurpose.io/viewEpisodes/139229"

    # Send a GET request to the webpage
    response: requests.Response = requests.get(url)

    # Parse the webpage content with BeautifulSoup
    soup = BeautifulSoup(response.text, "html.parser")

    for link in soup("link"):
        link.decompose()

    for script in soup("script"):
        script.decompose()

    breakpoint()

    # Find all 'tr' elements
    tr_elements = soup.find_all("tr")

    # List to hold all URLs
    urls = []

    # Iterate over each 'tr' element
    for tr in tr_elements:
        # Find all 'a' elements within the 'tr'
        a_elements = tr.find_all("a")

        breakpoint()

        # Iterate over each 'a' element
        for a in a_elements:
            # Get the 'href' attribute (the URL)
            url = a.get("href")

            # Add the URL to the list
            urls.append(url)

    return urls


def write_to_csv(urls):
    # Define the filename
    filename = "social_data.csv"

    # Open the file in write mode
    with open(filename, "w") as f:
        # Create a CSV writer
        writer = csv.writer(f)

        # Write the header
        writer.writerow(["URL"])

        # Write the URLs
        for url in urls:
            writer.writerow([url])


def main():
    urls = scrape_webpage()
    write_to_csv(urls)


if __name__ == "__main__":
    main()
