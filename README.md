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
    - from Ciao: https://ciao.shogakukan.co.jp/comics/title/00511/episode/9255 (NekoMeru Chapter 5)
    - from Young Jump: https://tonarinoyj.jp/episode/4856001361151760115 (Love Agency Chapter 1)
    - from Shounen Young Jump: https://shonenjumpplus.com/episode/3269754496567812827 (Kokoro no Program Chapter 1)

2. Get Node.js.
    - link to download: https://nodejs.org/en/download

3. Open a terminal and navigate to this folder. Any terminal, such as Command Prompt or Git Bash, will do.

4. Type the following into the command line: `npm install`. This will install everything the scraper needs to work.

5. Type the following into the command line: `node nanoscrape.js [URL]`, where `[URL]` is the chapter URL.

6. The scraper will get your images and write them to the "images" folder. This may take some time, depending
on your Internet connection and your computer's resources.

# USAGE

Command: `nanoscrape.js [-h] [-t TIMEOUT] [-hl HEADLESS] [-d DIRECTORY] [-r RETRIES] link_string`

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

**RETRIES** \
The scraper will occasionally flip a page and not collect any new images. When this happens, the scraper will continue to attempt to get new pages until it hits a maximum retry limit. The default maximum retries is 5, which is more than enough for most scenarios. However, you can change this value if, e.g. your connection to the site is choppy and the scraper tends to miss pages on the first few passes. The following example sets the maximum retry value to 10: \

 `node nanoscrape.js [link_string] -r 10`

 Note: increasing this value will necessarily cause the scraper to make a few extra passes at the end of the chapter, which will slightly increase total scraping time. Additionally, decreasing it risks the scraper closing prematurely and missing pages. I recommend leaving this as the default value unless you believe that changing it is absolutely necessary. 

# ENJOY

IMPORTANT NOTE: There are new rules about third-party cookies which are being rolled out on Chrome browsers in the near future. This will cause some serious problems for nanoscrape. As it is, the scraper still works but occasionally gets bombarded with "third party cookie will be blocked" messages. I'll do what I can to address this issue and hopefully keep the scraper functional after the rule passes.

# PATCH NOTES

5/21/2024
- Added a proper argument parser, making command-line execution much smoother and simpler. Updated README accordingly.
- Note: More options will be available in the future, escpecially options related to the browser session (e.g. the user agent).

5/19/2024
- Relaxed some restrictions on the scraper's waitForNetworkIdle usage, slightly improving scraping speed.
- Improved logic for directory renaming if a directory of the same name already exists.

5/18/2024
- Fixed a bug where the scraper would loop infinitely if a user tried to scrape the most recent chapter of a manga.
    - Note: This bugfix added new potential functionality to nanoscrape. I intend to update and streamline command-line
    execution for it soon to allow for more options and features. 

5/17/2024
- Added random-useragent to the browser session, adding an extra layer of stealth to the scraper.
    - Note: This is not enough to be undetectable. Upcoming updates will continue to prioritize scraper stealth and speed. 
- Added a try-catch block to main scrape loop to salvage any temp stored images if an error occurs during image collection.
- Added more print logs to make scraping process more transparent. (I also added a little NANOSCRAPE flair at program start.)

5/5/2024
- Optimized scrape strategy and changed loop condition to check page URL, finally killing the extra-image bug.

# BUGS

List up to date as of 5/19/2024
- WARNING: There is a bug with automated logins which causes the scraper to time out after the page loads. Do not use automated logins for pocket.shonenmagazine.com for the time being.
- There is a bug for some sites where the scraper collects a blank image as the first image for the chapter. This can be annoying because it sets the page indexes off by 1, but is otherwise harmless and will be dealt with after the above bug is fixed.
- There is a bug at the end of scraping a chapter where the scraper collects 0 new images a few times before saving them. This is caused by pages at the ends of chapters which the scraper already collected but still loops over in case it missed any. This bug is harmless but annoying and will be dealt with in the future.
