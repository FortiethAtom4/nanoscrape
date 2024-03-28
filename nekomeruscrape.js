const puppeteer = require('puppeteer');
const fs = require("fs");

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

if(process.argv.length < 3 || process.argv.length > 5){
    console.log("Usage: node nekomeruscrape.js [link to chapter] [(optional) timeout] [(optional) headless]");
    return
}

//framework from demo here:
//https://serpapi.com/blog/web-scraping-in-javascript-complete-tutorial-for-beginner/#web-scraping-with-javascript-and-puppeteer-tutorial
(async () => {
    try {
        let headoption = true;
        // Launch the browser and open a new blank page
        if(process.argv[4] == 'false'){
            headoption = false;
        }
        const browser = await puppeteer.launch({ headless: headoption }); // add the following: { headless: false } if you want to have the script open a physical browser
        const page = await browser.newPage();
        let link = process.argv[2];
        // Navigate the page to a URL
        // await page.goto(link);

        let timeout = 1000;
        if(process.argv[3]){
            timeout = process.argv[3];
        }

        //waits a set amount of network idle time before beginning scraping, default 1 second (1000 milliseconds). 
        //This is to allow the many images to load to the page, which typically takes a bit.
        console.log("reaching page and waiting for idle network...");
        await Promise.all([
            page.goto(link, {
              waitUntil: "domcontentloaded",
            }),
            page.waitForNetworkIdle({ idleTime: timeout }),
          ]);

        console.log("wait completed, gathering data..."); 
    
        //class selector for div with child image element: 'c-viewer__comic'

        //gets links to blob object URLs.
        const issueSrcs = await page.evaluate(() => {
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

        //opens all the object URL links and writes the data to png files. Images are saved in the "images" folder.
        if(!fs.existsSync(__dirname + "/images")){
            fs.mkdirSync(__dirname + "/images");
        }

        for (let i = 0; i < issueSrcs.length; i++) {
            const viewSource = await page.goto(issueSrcs[i]);
            fs.writeFile(__dirname + `/images/image_${i + 1}.png`, await viewSource.buffer(), () => console.log(`Image #${i + 1} downloaded`));
        }
    
        await browser.close();
    }catch(err){
        console.error(err);
    }
})();