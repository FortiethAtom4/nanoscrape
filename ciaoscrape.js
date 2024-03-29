const puppeteer = require('puppeteer');
const fs = require("fs");

if(process.argv.length < 3 || process.argv.length > 5){
    console.log("Usage: node nekomeruscrape.js [link to chapter] [(optional) timeout] [(optional) headless]");
    return
}

//works for: Ciao
//test link: https://ciao.shogakukan.co.jp/comics/title/00511/episode/9255 (NekoMeru Chapter 5)

//working on: Tonari no Young Jump
//test link: https://tonarinoyj.jp/episode/4856001361151760115 (Renai Daikou chapter 1)
//Problem: the page only loads new manga pages as you read them, meaning the page needs to be interacted with to get the whole chapter.



//waits a set amount of network idle time before beginning scraping, default 1 second (1000 milliseconds). 
//This is to allow the many images to load to the page, which typically takes a bit.
async function waitForPageLoad(page,timeout){
    console.log("Waiting for page elements to load...");
    await page.waitForNetworkIdle({ idleTime: timeout }).then(() => (console.log("-> Network idle timeout reached.")))
    .then(() => (console.log("Page elements loaded, proceeding with scraping...")));
}

(async () => {

    // Launch the browser
    let headoption = true;
    if(process.argv[4] == 'false'){
        headoption = false;
    }
    const browser = await puppeteer.launch({ headless: headoption });
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
            case "ciao.shogakukan.co.jp":
                
                //class selector for div with child image element: 'c-viewer__comic'

                await waitForPageLoad(page,timeout);

                //gets links to blob object URLs.
                issueSrcs = await page.evaluate(() => {
                    const srcs = document.querySelectorAll(".c-viewer__comic");
                    let imglinks = [];
                    for(let i = 0; i < srcs.length; i++){
                        let thing = srcs[i].innerHTML;
                        let attempt = thing.substring(thing.search("src="));
                        attempt = attempt.match("\".*\"");
                        //this is dumb, but it IS getting the temp link to the image, so...
                        attempt = attempt.toString().replaceAll("\"","").split(" ")[0];
        
                        imglinks.push(attempt);
                    }
                    return imglinks;
                });
                break

            case "tonarinoyj.jp":
                //class of next-page button: "page-navigation-forward rtl js-slide-forward"

                await waitForPageLoad(page,timeout);

                let newPage = await page.evaluate(() => {
                    const canvasselector = document.getElementsByClassName("page-image");
                    return canvasselector;
                }).then(() => (console.log("New page found, evaluating...")));
                issueSrcs.push(newPage);
                

                // let nextPageElements;
                // do {

                //     nextPageElements = await page.evaluate(() => {
                //         return document.getElementsByClassName("page-navigation-forward rtl js-slide-forward");
                //     })
                //     console.log(`Moving to ${nextPageElements}`);
                //     await page.click(nextPageElements);

                //     let newPage = await page.evaluate(() => {
                //         const canvasselector = document.getElementsByClassName("page-image js-page-image");
                //         return canvasselector;
                //     }).then(() => (console.log("New page found, evaluating...")));

                //     for(let i = 0; i < newPage.length; i++){
                //         issueSrcs.push(newPage[i]);
                //     }

                // } while (page.url() === process.argv[2]);

                console.log(issueSrcs);
                console.log("Coming soon");
                return

            default:
                throw new Error(`Given URL "${process.argv[2]}" is not a recognized URL for manga scraping.`);
        }
        

        //opens all the URL links and writes the data to png files. Images are saved in the "images" folder.
        if(!fs.existsSync(__dirname + "/images")){
            console.log("No image directory found. Creating directory...");
            fs.mkdirSync(__dirname + "/images");
        }

        console.log("Writing images to directory...")
        for (let i = 0; i < issueSrcs.length; i++) {
            const viewSource = await page.goto(issueSrcs[i]);
            await fs.writeFile(__dirname + `/images/page_${i + 1}.png`, await viewSource.buffer(), () => console.log(`-> Page #${i + 1} downloaded.`));
        }


    }catch(err){
        console.error(`\nAn error occurred during scraping. Stack trace: \n${err.stack}\n\nEnsure your URL and options are correct and try again.`);
    } finally {
        await browser.close();
        console.log("\n-> Scraper closed successfully.");
    }
})();