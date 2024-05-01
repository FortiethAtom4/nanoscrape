const puppeteer = require('puppeteer');
const fs = require("fs");
const { parse } = require('path');
const { time } = require('console');
const prompt = require("prompt-sync")();

if(process.argv.length < 3 || process.argv.length > 6){
    console.log("Usage: node nanoscrape.js [link to chapter] [(optional) timeout] [(optional) headless] [(optional) path]");
    return
}

//works for: 
//1. Ciao
//test link: https://ciao.shogakukan.co.jp/comics/title/00511/episode/9255 (NekoMeru, Chapter 5)
//2. Tonari no Young Jump
//test link: https://tonarinoyj.jp/episode/4856001361151760115 (Renai Daikou, Chapter 1)
//3. Shounen Jump Plus
//test link: https://shonenjumpplus.com/episode/3269754496567812827 (Kokoro no Program, Chapter 1)

//working on: Young Jump
//test link: https://www.s-manga.net/reader/main.php?cid=9784088931678 (some baseball manga i forget the name)

//waits a set amount of network idle time before beginning scraping, default 1 second (1000 milliseconds). 
//This is to allow the many images to load to the page, which typically takes a bit.
async function waitForPageLoad(page,timeout,selector){
    console.log("Waiting for page elements to load...");
    await Promise.all([
        page.waitForSelector(selector).then(() => (console.log("-> Page image elements detected."))),
        page.waitForNetworkIdle({ idleTime: timeout }).then(() => (console.log("-> Network idle timeout reached.")))
    ]).then(() => (console.log("Page elements loaded, proceeding with scraping...")));
}

async function waitForPageLoadAlt(page,selector){
    console.log("Waiting for page elements to load...");
    await page.waitForSelector(selector).then(() => (console.log("-> Page image elements detected.")))
    .then(() => (console.log("Page elements loaded, proceeding with scraping...")));
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// method from https://intoli.com/blog/saving-images/
const parseDataUrl = (dataUrl) => {
    const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (matches.length !== 3) {
      throw new Error('Could not parse data URL.');
    }
    return { mime: matches[1], buffer: Buffer.from(matches[2], 'base64') };
};

let dataSaveFunction;
let directoryname; //these will be initialized on a successful scrape.
let prevLength = -1;



(async () => {
    // Launch the browser
    let headoption = true;
    if(process.argv[4] == 'false'){
        headoption = false;
    }
    const browser = await puppeteer.launch(  { args: ['--disable-web-security' ], headless: headoption });
    try {
        //Open a new page
        const page = await browser.newPage();
        let link = process.argv[2];

        let timeout = 1000;
        if(process.argv[3]){
            timeout = process.argv[3];
        }



        
        console.log("Waiting for page load...");
        await page.goto(link, {
            waitUntil: "domcontentloaded",
          }).then(() => (console.log(`-> Page reached.`)));

        const host = await page.evaluate(() => {
            return window.location.hostname;
        });

        console.log(`Site hostname: ${host}`);

        let issueSrcs = [];

        //perform different processes depending on the manga site given:
        switch(host){

            //as of 4/25/2024 all three of my main scraping sites now use the same page load strategy. Weird.
            case "ciao.shogakukan.co.jp":
            case "tonarinoyj.jp":
            case "shonenjumpplus.com":
            case "pocket.shonenmagazine.com":

                //selectors for the dynamic-page load strategy.
                let canvas_selector;
                let navigation_selector;

                //Selectors for each site. 
                if(host == "ciao.shogakukan.co.jp"){
                    canvas_selector = ".c-viewer__comic";
                    navigation_selector = ".c-viewer__pager-next";
                }else{
                    canvas_selector = ".page-image";
                    navigation_selector = ".page-navigation-forward";
                }

                //Dialogue to use login information to get to a page.
                //Pages appear normally once logged in (if the chapter is paid for).
                if(await page.$(".rental-button")){
                    console.log("This chapter requires a login and rental to scrape.");
                    console.log("**Note: Be sure the chapter is rented on the logged-in account before scraping.**");
                    await page.click(".rental-button");
                    let user = prompt("Username: ");
                    let pw = prompt("Password: ");
                    await page.type("div.setting-inner:nth-child(3) > form:nth-child(1) > p:nth-child(4) > input:nth-child(1)",user);
                    await page.type("div.setting-inner:nth-child(3) > form:nth-child(1) > p:nth-child(5) > input:nth-child(1)",pw);

                    await page.click("div.setting-inner:nth-child(3) > form:nth-child(1) > div:nth-child(7) > button:nth-child(1)");

                }
                //class of next-page button: "page-navigation-forward rtl js-slide-forward"
                await waitForPageLoadAlt(page,canvas_selector);
                console.log("This site dynamically loads images. Beginning page click simulation...");
                console.log("WARNING: this can take some time, depending on chapter length.");

                issueSrcs = new Set();
                prevLength = -1;

                //Gets canvas Data URL links. Because of this algorithm's potential to accidentally grab copies of the same URL
                //due to the website's dynamic load/offload nature, a Set data object is necessary.
                while(prevLength != Array.from(issueSrcs).length){

                    prevLength = Array.from(issueSrcs).length;

                    let pageChunk = await page.evaluate(async () => {
                        let canvases = document.getElementsByTagName("canvas");
                        let canvasdata = [];
                        for(let i = 0; i < canvases.length; i++){
                            canvasdata.push(canvases[i].toDataURL());
                        }
                        return canvasdata;
                    });

                    for(let i = 0; i < pageChunk.length; i++){
                        issueSrcs.add(pageChunk[i]);
                    }

                    //simulates clicking forward with a slight pause in between each click.
                    //this will cause the page to load more images in, which can then be scraped.

                    //NOTE: there is a bug where the scraper sometimes scrapes more than its assigned chapter due to this loop. 
                    //the page.url() condition should deal with the majority of these occurrences, but it could still happen. 
                    if(await page.$(navigation_selector) !== null && page.url() == process.argv[2]){
                        await page.click(navigation_selector)
                        .then(() => (sleep(250)));
                        await page.click(navigation_selector)
                        .then(() => (sleep(250))); 
                        //going 4 pages in, easier to just type out twice rather than make a loop of 2 
                    }

                    //Another buffer to make sure the network loads. Might be overkill, but better than missing pages.
                    await page.waitForNetworkIdle(timeout);

                    
                    console.log(`-> Got ${Array.from(issueSrcs).length - prevLength} images. Total: ${Array.from(issueSrcs).length}`)

                    
                }

                //parse and save the data from the images' data URLs.
                dataSaveFunction = (directoryname) => {
                    issueSrcs = Array.from(issueSrcs);
                    for (let i = 0; i < issueSrcs.length; i++) {
                        const { buffer } = parseDataUrl(issueSrcs[i]);
                        fs.writeFileSync(`${directoryname}/page_${i + 1}.png`, buffer, 'base64');
                        console.log(`-> Page #${i + 1} downloaded.`);

                    }
                };
                break

            case "www.s-manga.net":

                await waitForPageLoad(page,timeout,"#content");
                //get the thirds of an image to splice together.
                let pageTest = await page.evaluate(async () => {
                    let retarr = []; //not intentional.
                    retarr.push(document.querySelector("#content-p1 > div:nth-child(1) > div:nth-child(1) > img:nth-child(1)"));
                    retarr.push(document.querySelector("#content-p1 > div:nth-child(1) > div:nth-child(2) > img:nth-child(1)"));
                    retarr.push(document.querySelector("#content-p1 > div:nth-child(1) > div:nth-child(3) > img:nth-child(1)"));
                    return retarr; 
                });
                console.log("-> Page acquired.")
                console.log(pageTest[0]);
                dataSaveFunction = (directoryname) => {
                    const { buffer1 } = parseDataUrl(pageTest[0]);
                    const { buffer2 } = parseDataUrl(pageTest[1]);
                    const { buffer3 } = parseDataUrl(pageTest[2]);

                    fs.writeFileSync(`${directoryname}/page_1.png`, buffer1, 'base64');
                    fs.writeFileSync(`${directoryname}/page_1.png`, buffer2, 'base64');
                    fs.writeFileSync(`${directoryname}/page_1.png`, buffer3, 'base64');

                    console.log("-> File written to " + directoryname);
                }




                // console.log("Not yet available. Coming soon");

                // return
                break

            default:
                throw new Error(`Given URL "${process.argv[2]}" is not a recognized URL for manga scraping.`);
        }
        

        //opens all the URL links and writes the data to png files. Images are saved in a folder in this directory.

        if(!process.argv[5]){
            directoryname = __dirname + "/images_" + await page.evaluate(() => {
                return window.location.hostname;
            });
        } else{
            directoryname = __dirname + "/" + process.argv[5];
        }

        let shift = 0;
        while(fs.existsSync(directoryname)){
            shift += 1;
            directoryname = directoryname + "_" + shift;
        }
        console.log("Creating directory...");
        fs.mkdirSync(directoryname, { recursive: true });


        console.log("Writing images to directory...");
        await dataSaveFunction(directoryname);


    }catch(err){
        console.error(`\nAn error occurred during scraping. Stack trace: \n${err.stack}\n\nEnsure your URL and options are correct and try again.`);
    } finally {
        await browser.close();
        if(directoryname){
            console.log(`\n-> Scrape complete. Images have been saved in directory ${directoryname}.`);
        }
        console.log("\n-> Scraper closed successfully.");
    }
})();