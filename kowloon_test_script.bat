:: # This script will scrape the first 3 chapters of Kowloon Generic Romance automatically.
:: # To use, type "./kowloon_test_script.txt" at the command line.
:: # It will take a minute, so sit back and relax.

node nanoscrape.js https://shonenjumpplus.com/episode/316190247112832486 -d scrapes/kowloon/ch1
node nanoscrape.js https://shonenjumpplus.com/episode/316190247112832521 -d scrapes/kowloon/ch2
node nanoscrape.js https://shonenjumpplus.com/episode/316190247112832563 -d scrapes/kowloon/ch3

:: # Note: looks like everything after chapter 3 needs to be rented in order to access it. 50 "points" of some kind for a 48 hour rental.
:: # Maybe a small investment for scrapes is in order?

