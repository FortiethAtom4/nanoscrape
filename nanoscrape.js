const puppeteer = require('puppeteer');
const fs = require("fs");

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

// method from https://intoli.com/blog/saving-images/
const parseDataUrl = (dataUrl) => {
    const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (matches.length !== 3) {
      throw new Error('Could not parse data URL.');
    }
    return { mime: matches[1], buffer: Buffer.from(matches[2], 'base64') };
};

let dataSaveFunction;

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

        let timeout = 2000;
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

                await waitForPageLoad(page,timeout,".c-viewer__comic");

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


                dataSaveFunction = async (directoryname) => {
                    for (let i = 0; i < issueSrcs.length; i++) {
                        const viewSource = await page.goto(issueSrcs[i]);
                        await fs.writeFile(directoryname + `/page_${i + 1}.png`, await viewSource.buffer(), () => console.log(`-> Page #${i + 1} downloaded.`));
                    }
                }
                break

            case "tonarinoyj.jp":
            case "shonenjumpplus.com":
                //class of next-page button: "page-navigation-forward rtl js-slide-forward"
                await waitForPageLoad(page,timeout,".page-image");
                console.log("This site dynamically loads images. Beginning page click simulation...");

                issueSrcs = new Set();
                let prevLength = -1;
                await page.click(".page-navigation-forward");

                //Gets canvas Data URL links. Because of the potential to accidentally grab copies of the same URL
                //due to this website's dynamic load/offload nature, a Set data object is necessary.
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
                    //This simulates clicking further into the chapter, which causes more pages to load.
                    //I can go forward ~6 pages without losing anything... hopefully

                    for(let i = 0; i < 3; i++){
                        await page.click(".page-navigation-forward")
                        .then(() => (page.waitForNetworkIdle({idleTime: 50})));
                    }
                    console.log(`-> Got ${Array.from(issueSrcs).length - prevLength} images. Total: ${Array.from(issueSrcs).length}`)

                    
                }

                dataSaveFunction = (directoryname) => {
                    issueSrcs = Array.from(issueSrcs);
                    for (let i = 0; i < issueSrcs.length; i++) {
                        // await page.goto(issueSrcs[i],{waitUntil: 'domcontentloaded'});
                        const { buffer } = parseDataUrl(issueSrcs[i]);
                        fs.writeFileSync(`${directoryname}/page_${i + 1}.png`, buffer, 'base64');
                        console.log(`-> Page #${i + 1} downloaded.`);

                    }
                };
                break

            case "www.s-manga.net":
                console.log("Not yet available. Coming soon");
                return
                //break

            default:
                throw new Error(`Given URL "${process.argv[2]}" is not a recognized URL for manga scraping.`);
        }
        

        //opens all the URL links and writes the data to png files. Images are saved in a folder in this directory.
        let directoryname;
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
        console.log("\n-> Scraper closed successfully.");
    }
})();