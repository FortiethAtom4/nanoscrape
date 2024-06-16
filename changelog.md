# 6/16/2024
- A Note: As of recently, the manga Renai Daikou - Love Agency has been cancelled. Because of this, future scraping efforts will be directed at other manga sites.
- Some minor improvements to code semantics and argument parsing.
- Added this file so future updates will no longer clog the README.

# 5/22/2024
- Added an optional argument to choose a user agent for the scrape session. 
- Experimental speed optimizations. Tests showed a significant increase in average scrape speed with no loss in quality.
    - This is still in testing and may be changed. See Bugs for more information.
- Changed scraper loop to check for total number of pages before scraping, making the scraper less prone to Internet-related issues.
    - This rendered the RETRIES optional parameter obsolete. It has since been removed.
- A potential bugfix for the automated login bug has been added. Tests are still ongoing.

# 5/21/2024
- Added a proper argument parser, making command-line execution much smoother and simpler. Updated README accordingly.
    - Note: More options will be available in the future, escpecially options related to the browser session (e.g. the user agent).

# 5/19/2024
- Relaxed some restrictions on the scraper's waitForNetworkIdle usage, slightly improving scraping speed.
- Improved logic for directory renaming if a directory of the same name already exists.

# 5/18/2024
- Fixed a bug where the scraper would loop infinitely if a user tried to scrape the most recent chapter of a manga.
    - Note: This bugfix added new potential functionality to nanoscrape. I intend to update and streamline command-line
    execution for it soon to allow for more options and features. 

# 5/17/2024
- Added random-useragent to the browser session, adding an extra layer of stealth to the scraper.
    - Note: This is not enough to be undetectable. Upcoming updates will continue to prioritize scraper stealth and speed. 
- Added a try-catch block to main scrape loop to salvage any temp stored images if an error occurs during image collection.
- Added more print logs to make scraping process more transparent. (I also added a little NANOSCRAPE flair at program start.)

# 5/5/2024
- Optimized scrape strategy and changed loop condition to check page URL, finally killing the extra-image bug.