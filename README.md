# nanoscrape

A simple manga scraper.

Made by Zirconium (@FortiethAtom4 on Github)

# HOW TO USE THIS SCRAPER

1. Get a link to the chapter from any of the sites nanoscrape recognizes. \
Full list of recognized domains:
- ciao.shogakukan.co.jp
- tonarinoyj.jp
- shonenjumpplus.com
- pocket.shonenmagazine.com

This list will continue to increase; nanoscrape.js is in continuous development with the goal to be able to recognize and scrape from as many manga sites as possible.

- Example test links:
    - from Ciao: https://ciao.shogakukan.co.jp/comics/title/00511/episode/7781 (NekoMeru Chapter 1)
    - from Young Jump: https://tonarinoyj.jp/episode/4856001361151760115 (Love Agency Chapter 1)
    - from Shounen Young Jump: https://shonenjumpplus.com/episode/3269754496567812827 (Kokoro no Program Chapter 1)

2. Get Node.js.
    - link to download: https://nodejs.org/en/download

3. Open a terminal and navigate to this folder. Any terminal, such as Command Prompt or Git Bash, will do.

4. Type the following into the command line: `npm install`. This will install everything the scraper needs to work.

5. Type the following into the command line: `node nanoscrape.js [URL]`, where `[URL]` is the chapter URL.

6. The scraper will get your images and write them to a local folder (or to a new custom directory, if you choose). This may take some time, depending on your Internet connection and your computer's resources.

# USAGE

Command: `node nanoscrape.js [-h] [-t TIMEOUT] [-hl HEADLESS] [-d DIRECTORY] [-a USERAGENT] link_string`

# OPTIONS

**TIMEOUT** \
The command waits for the network to be idle before beginning scraping. The default wait time is 1000 milliseconds. You can change this value by adding a number (in milliseconds) to the end of the command. For example, the following will wait for 5000 milliseconds of network idle time instead of 1000 before scraping:

`node nanoscrape.js [link_string] -t 5000`

This is done to ensure all images have loaded before scraping begins. If your computer is slow or your internet connection is choppy, consider using a higher timeout time to compensate. To avoid causing bugs during scraping (i.e. missing pages), I highly recommend not using values lower than 1000 milliseconds.

**HEADLESS** \
By default, the scraper uses a headless browser to get images; that is, it does not visually render the browser while it operates. You can tell the scraper to render the page it is using by adding "false" at the end of the command line.

Example: `node nanoscrape.js [link_string] -hl false`

**DIRECTORY** \
By default, the scraper will automatically generate a name for the image folder. You can override this by adding in a custom name for your folder(s) on the command line. The folder generates from the directory nanoscrape.js is in. Subfolders are permitted, e.g. "folder-1/folder-2". The images will be saved in folder-2, within folder-1. 

Examples: \
`node nanoscrape.js [link_string] -d path/to/my/folder`\
`note nanoscrape.js [link_string] -d "folder name with spaces"`

**USERAGENT** \
The scraper uses a random user agent when scraping by default. This is a typical scraper strategy to avoid detection. However, you can choose your own user agent or to use a local default Chrome user agent.

Examples: \
`node nanoscrape.js [link_string] -a default`
`node nanoscrape.js [link_string] -a [user_agent_string]`

Note: To avoid being detected and/or blocked, I recommend sticking to random user agents unless you believe that setting this value is absolutely necessary. 

# TROUBLESHOOTING

Occasionally, errors will occur while scraping. This can happen for a variety of reasons. Web browsers and protocols are incredibly complex, and it is inevitable that something goes awry. Here are a few common errors that occur while scraping, along with with some simple solutions:
1. The scraper says "Network idle timeout reached," hangs for a bit, then times out and closes without scraping anything.
    Likely Problem: The website took an unusually long time to load. This is bound to happen, especially if you are based somewhere far from Japan where most of these sites are hosted. 
    Solution: Set the 'timeout' value of the scraper to a higher value using the `-t` optional parameter. 
    Example: `node nanoscrape.js [link_string] -t 2000`


# ENJOY

IMPORTANT NOTE: There are new rules about third-party cookies which are being rolled out on Chrome browsers in the near future. This will cause some serious problems for nanoscrape. As it is, the scraper still works but occasionally gets bombarded with "third party cookie will be blocked" messages. I'll do what I can to address this issue and hopefully keep the scraper functional after the rule passes.

# LIST OF KNOWN BUGS

List up to date as of 5/22/2024
- There is a bug with automated logins which causes the scraper to time out after the page loads.
    - This bug MAY be fixed now, but tests are still ongoing. Use with caution.
- There is a bug when scraping manga on Ciao where an extra blank image is scraped and downloaded. For some reason in testing it always seemed to be ordered at the same index. This bug does not affect valid images, and chapters appear to still be successfully scraped, but it disrupts the scraper's page numbering which can be very annoying for long chapters.
