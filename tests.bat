:: this file grabs the first chapter of 3 manga from various sites, scrapes them, and puts them in a separate "tests" directory.

@ECHO OFF

node nanoscrape.js https://ciao.shogakukan.co.jp/comics/title/00511/episode/7781 -d tests/nekomeru/ch1
node nanoscrape.js https://tonarinoyj.jp/episode/4856001361151760115 -d tests/"renai daikou"/ch1
node nanoscrape.js https://shonenjumpplus.com/episode/3269754496567812827 -d tests/knp/ch1