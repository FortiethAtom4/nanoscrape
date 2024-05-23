const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin()); //to avoid typical forms of bot detection - but not enough for everything
const fs = require("fs");
const prompt = require("prompt-sync")();
const randomUA = require("random-useragent");
const { ArgumentParser } = require('argparse');

//works for: 
//1. Ciao
//test link: https://ciao.shogakukan.co.jp/comics/title/00511/episode/20257 (NekoMeru, Chapter 6)
//2. Tonari no Young Jump
//test link: https://tonarinoyj.jp/episode/4856001361151760115 (Renai Daikou, Chapter 1)
//3. Shounen Jump Plus
//test link: https://shonenjumpplus.com/episode/3269754496567812827 (Kokoro no Program, Chapter 1)

//Next target: Young Jump
//test link: https://www.s-manga.net/reader/main.php?cid=9784088931678 (some baseball manga i forget the name)


//TODO: Load a dummy session on each site. Get cookies related to the site and save them. Use those cookies for future scrape attempts.

//waits a set amount of network idle time before beginning scraping, default 1 second (1000 milliseconds). 
//This is to allow the many images to load to the page, which typically takes a bit.


//Global variable stuff (cringe)
let dataSaveFunction; //variable function for the data saving algorithm.
let directoryname; //these will be initialized on a successful scrape.
let d; //will be used to determine scrape duration.
//Argument parsing.
const parser = new ArgumentParser({
    description: 'A simple manga scraper by FortiethAtom4.'
});
parser.add_argument("link_string",{"help":"URL to the manga chapter."});
parser.add_argument("-t","--timeout",{"help":"The minimum network idle wait time before the scraper continues (default 1000ms)."});
parser.add_argument("-hl","--headless",{"help":"Set this to `f` or `false` to render the browser while the scraper operates."});
parser.add_argument("-d","--directory",{"help":"Designate a destination for the scraped images. Creates a new directory at the given path if not already available."});
parser.add_argument("-r","--retries",{"help":"If no new images found, maximum number of retries before scraper closes (default 5)."});
parser.add_argument("-a","--useragent",{"help":"Set the browser's user agent for the scraping session. Type 'random' to set a random agent."});
args = parser.parse_args();

//helper functions
async function waitForPageLoad(page,timeout,selector){
    console.log("Waiting for page elements to load...");
    await Promise.all([
        page.waitForSelector(selector).then(() => (console.log("-> Page image elements detected."))),
        page.waitForNetworkIdle({ idleTime: timeout }).then(() => (console.log("-> Network idle timeout reached.")))
    ]).then(() => (console.log("Page elements loaded, proceeding with scraping...")));
}

//alternate page load function (defunct for now)
// async function waitForPageLoadAlt(page,selector){
//     console.log("Waiting for page elements to load...");
//     await page.waitForSelector(selector).then(() => (console.log("-> Page image elements detected.")))
//     .then(() => (console.log("Page elements loaded, proceeding with scraping...")));
// }

const sleep = ms => new Promise(r => setTimeout(r, ms));

// method from https://intoli.com/blog/saving-images/
const parseDataUrl = (dataUrl) => {
    const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (matches.length !== 3) {
      throw new Error('Could not parse data URL.');
    }
    return { mime: matches[1], buffer: Buffer.from(matches[2], 'base64') };
};



async function doLogin(page,buttonSelector,userSelector,pwSelector,enterInfoSelector){
    console.log("This chapter requires a login and rental to scrape.");
    console.log("**Note: Be sure the chapter is rented on the logged-in account before scraping.**");
    await page.click(buttonSelector);
    let user = prompt("Username: ");
    let pw = prompt("Password: ",{echo:"*"});
    await page.type(userSelector,user)
    .then(() => (page.type(pwSelector,pw)))
    await Promise.all([
        await page.click(enterInfoSelector),
        await page.waitForNavigation({timeout: 60000})
    ])
    
    console.log("Credentials entered.");
    // while(await page.$(".js-login-error-message") != null) {
    //     console.log("Login failed, please try again.")
    //     await doLogin(page,buttonSelector,userSelector,pwSelector,enterInfoSelector);
    // }

}


(async () => {


    // console.log(args["timeout"]);
    let headoption = true;
    if(args["headless"] == "f" || args["headless"] == "false"){
        headoption = false;
    }
    // Launch the browser.
    // web security must be disabled in order to download from canvas data URLs.
    const browser = await puppeteer.launch(  { product: 'chrome', args: ['--disable-web-security' ], headless: headoption });
    try {
        console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
        console.log("~~~~~~~~~~NANOSCRAPE~~~~~~~~~~")
        console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n")
        console.log("nanoscrape version 5/21/2024.");
        //Open a new page
        const page = (await browser.pages())[0];
        let link = args["link_string"];

        let timeout = args["timeout"] ? args["timeout"] : 1000;

        // will have to do more work here later. Third-party cookie blocking stinks.
        console.log("Setting user agent...");
        
        let newua = "";
        if(args["useragent"]){
            newua = args["useragent"] == "default" ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" : args["useragent"];
        } else {
            newua = await randomUA.getRandom();
        }
        console.log(`User agent for this session: ${newua}`);
        await page.setUserAgent(newua);

        
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

            //as of 4/25/2024 all four of my main scraping sites now use the same page load strategy. Weird.
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
                if(await page.$(".read-button")){
                    await sleep(timeout);
                    await doLogin(page,".read-button",
                "div.js-show-for-guest > form:nth-child(1) > p:nth-child(4) > input:nth-child(1)",
                "div.js-show-for-guest > form:nth-child(1) > p:nth-child(5) > input:nth-child(1)",
                "div.common-button-container:nth-child(7) > button:nth-child(1)");
                }

                if(await page.$(".rental-button")){
                    await sleep(timeout);
                    await doLogin(page,".rental-button",
                    "div.setting-inner:nth-child(3) > form:nth-child(1) > p:nth-child(4) > input:nth-child(1)",
                    "div.setting-inner:nth-child(3) > form:nth-child(1) > p:nth-child(5) > input:nth-child(1)",
                    "div.setting-inner:nth-child(3) > form:nth-child(1) > div:nth-child(7) > button:nth-child(1)");

                }

                


                //class of next-page button: "page-navigation-forward rtl js-slide-forward"
                await waitForPageLoad(page,timeout,canvas_selector);
                d = new Date(); //for determining duration of scrape.
                console.log("This site dynamically loads images. Beginning page click simulation...");
                console.log("WARNING: this can take some time, depending on chapter length.");

                issueSrcs = new Set();
                //Used to limit image collection retries if e.g. no extra chapter exists for scraper to navigate to.
                let maxRetries = args["retries"] ? args["retries"] : 5;
                let curRetries = 0;
                let prevImgCount = 0;
                //To be implemented in a future update.
                // prevLength = await page.evaluate(() => {
                //     let numImgs = document.querySelectorAll("p, .page-area");
                //     return numImgs;
                // });
                // console.log(prevLength);
                page.on('console', (msg) => {console.log(msg.text())}) //for testing only
                //Gets canvas Data URL links. Because of this algorithm's potential to accidentally grab copies of the same URL
                //due to the website's dynamic load/offload nature, a Set data object is necessary.
                while(page.url() == args["link_string"] && curRetries < maxRetries){
                    try{
                        
                        let pageChunk = await page.evaluate(async (canvas_selector) => {
                            let canvases = document.getElementsByTagName("canvas");
    
                            let canvasdata = [];
                            for(let i = 0; i < canvases.length; i++){
                                // console.log(canvases[i].parentElement.className);
                                canvasdata.push(canvases[i].toDataURL());
                            }
    
                            return canvasdata;
                            
                        },canvas_selector);
                        let chunklength = await pageChunk.length;
                        console.log(`-> Found ${chunklength} images.`)
                        for(let i = 0; i < chunklength; i++){
                            await issueSrcs.add(pageChunk[i]);
                        }
                        //Retry getting new images, end scraping if no new images after 5 iterations.
                        let srcslength = await Array.from(issueSrcs).length
                        if(srcslength == prevImgCount){
                            curRetries += 1;
                        }
                        prevImgCount = srcslength;
                        console.log(`-> Total unique images saved: ${srcslength}`);

                        //simulates clicking forward a page in the chapter.
                        //this will cause the site to load more images in, which can then be scraped.
                        console.log("Moving forward a page...");
                        if(await page.$(navigation_selector) !== null){
                            await page.click(navigation_selector);
                        }
                        

                    } catch (e){
                        console.error(`An error occurred during image collection. \nError message:\n${e}\n`);
                        console.log("Saving temp images and aborting scrape...\n");
                        break
                    }
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

                console.log("Not yet available. Coming soon");

                // return
                break

            default:
                throw new Error(`Given URL "${args["link_string"]}" is not a recognized URL for manga scraping.`);
        }
        

        //opens all the URL links and writes the data to png files. Images are saved in a folder in this directory.
        let shift = 0;
        if(!args["directory"]){
            directoryname = __dirname + "/images_" + await page.evaluate(() => {
                return window.location.hostname;
            });
        } else{
            directoryname = __dirname + "/" + args["directory"];
        }
        //if directory already exists, make a new directory with a slightly altered name
        if(fs.existsSync(directoryname)){
            directoryname += "_0";
        }
        while(fs.existsSync(directoryname)){
            shift += 1;
            for(let i = 0; i < shift; i++){
                directoryname += "0";
            }
            
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
            let endd = new Date() - d; //total time in milliseconds
            let endgameminutes = Math.trunc(endd/60000);
            let endgameseconds = Math.trunc((endd % 60000)/1000);
            //time formatting, adding 0s to make more readable
            if(endgameseconds < 10){
                endgameseconds = "0" + endgameseconds;
            }
            let endgamemillis = endd % 1000;
            if(endgamemillis < 100){
                endgamemillis = "0" + endgamemillis;
            }
            if(endgamemillis < 10){
                endgamemillis = "0" + endgamemillis; //theres got to be a better way to add these 0s
            }
            console.log(`Total scrape time: ${endgameminutes}:${endgameseconds}.${endgamemillis}`);
        }
        console.log("\n-> Scraper closed successfully.");
    }
})();